// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
import { createHash } from 'node:crypto';
import type { Center } from './center.ts';
import { HttpError, type Context } from './shared.ts';
import { appObservations } from './runtime.ts';
import { screenTargets } from './runtime-screen.ts';

// modified by jinlong.feng at 2026-11-22 KF报警规则回读
import { one, windowAlarmSource, findRule, ruleSnapshot, projectContext as project } from './alarm-rule.ts';
// end
export async function alarmRoute(center: Center, token: string, context: Context, tag: string) {
  if (context.kind !== 'page' || !context.control) throw new HttpError(400, '请在二维编辑器单选实时报警窗。');
  await center.require(token, context);
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
  const [{control,alias,eventSource,definitions,alarmCtx},resources,identity]=await Promise.all([
    windowAlarmSource(center,token,context),center.call(token,'/opscenter/api/v1/opsResourceData'),center.call(token,'/user/userInfo')
  ]);
// end
  const apps = (resources.appResource || []).filter((a: any) => a.canOperate === true);
  const projectApp = (id: string, type: number, name?: string): any =>
    one(
      apps.filter((a: any) => a.projectId === id && a.projectType === type && (!name || a.appName === name)),
      '对应运行 App',
    );
  const client = projectApp(context.projectId, 1);
  const eventApp = projectApp(eventSource.guid, 3, alias.appName);
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
  const alarm = projectApp(alarmCtx.projectId,4,eventSource.config.alarmProject);
  const [rule, connections] = await Promise.all([findRule(center,token,alarmCtx,tag),center.call(token,'/alarm/dataSource',{guid:alarmCtx.projectId})]);
// end
  const link: any = one(
    Object.values(connections).filter((r: any) => r.name === rule.DataSourceName),
    '报警词典连接',
  );
  const sourceCtx = project('datasource', link.dm_guid);
  await center.require(token, sourceCtx);
  const rt: any = one(
    definitions.filter((d: any) => d.guid === link.dm_guid && d.name === link.dm_name),
    '词典实时源',
  );
  if (
    !rt.config?.engineeringId ||
    !rt.config.dataType?.some((v: unknown) => String(v) === '1') ||
    !/KingIOServer/i.test(rt.config.newWorkDateType || rt.type)
  )
    throw new HttpError(409, '实时源未提供支持的数采工程标识。');
  const ioCtx = project('collection', rt.config.engineeringId);
  await center.require(token, ioCtx);
  const io = projectApp(ioCtx.projectId, 2, rt.config.engineeringName);
  const rtApp = projectApp(rt.guid, 3);
  const chosen = [client, eventApp, alarm, rtApp, io];
  const statuses = await center.call(
    token,
    '/opscenter/api/v1/displayAppListStatus',
    {},
    { appIds: chosen.map((a) => a.appId) },
  );
  const contexts = [context, project('datasource', eventSource.guid), alarmCtx, sourceCtx, ioCtx];
  const dependencies = chosen.map((a, i) => {
    const placement = one(
      appObservations(resources, statuses, contexts[i], a.projectType).filter((r) => r.appId === a.appId),
      '实例部署回执',
    );
    if (placement.process !== '运行中' || placement.deployed !== '已部署')
      throw new HttpError(409, '对应实例当前没有运行和部署回执。');
    return { ...contexts[i], runtimeApp: a.appId, runtimeNode: placement.nodeId };
  });
  if (new Set(dependencies.map((d) => d.runtimeNode)).size !== 1)
    throw new HttpError(409, '当前采样联查支持同一节点上的实例。');
  const monitor = await center.monitorPoint(token, ioCtx, io.appId, tag);
  const targets = screenTargets(resources, context, identity.userName).filter(
    (t) => t.appId === client.appId,
  );
  if (!targets.length) throw new HttpError(409, '运行窗地址无法在当前节点唯一定位。');
  for (const dep of dependencies) await center.require(token, dep);
  const configuration = createHash('sha256')
    .update(JSON.stringify([control, alias, eventSource.config, rule, link, rt.config]))
    .digest('hex');
  return {
    // modified by jinlong.feng at 2026-11-22 KF报警规则回读
    ruleSnapshot:ruleSnapshot(alarmCtx.projectId,rule),
    // end
    configuration,
    context,
    dependencies,
    monitor,
    targets,
    alias: control.dateSource as string,
    windowName: control.name as string,
    tag,
    alarmProject: alarm.projectName as string,
    alarmApp: alarm.appName as string,
    ruleId: String(rule.ID),
  };
}
export type AlarmRoute = Awaited<ReturnType<typeof alarmRoute>>;
// end
