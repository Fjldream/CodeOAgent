// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import type { Context } from './shared.ts';

export type AppObservation = {
  appId: string;
  nodeId: string;
  name: string;
  // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
  configuredVersion?: string;
  deployed: string;
  // end
  process: string;
};
// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
export function permittedInstances(data: any, context: Context, type: number) {
  const result: Pick<AppObservation, 'appId' | 'nodeId' | 'name'>[] = [];
  if (!Array.isArray(data?.nodeProApp) || !Array.isArray(data?.appResource)) return result;
  for (const app of data.appResource) {
    if (app?.projectId !== context.projectId || app.projectType !== type || app.canOperate !== true) continue;
    const nodes = data.nodeProApp.filter((n: any) => n.appPros?.some((p: any) => p.appId === app.appId));
    if (nodes.length === 1) result.push({ appId: app.appId, nodeId: nodes[0].nodeId, name: app.appName });
  }
  return result;
}
export function appObservations(data: any, status: any[], context: Context, type: number): AppObservation[] {
  const observations: AppObservation[] = [];
  if (!Array.isArray(status)) return observations;
  for (const app of permittedInstances(data, context, type)) {
    const states = status.filter((row) => row.appId === app.appId);
    if (states.length !== 1) continue;
    // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
    const state = states[0];
    const matching = data.appResource.filter(
      (item: any) =>
        item.appId === app.appId &&
        item.projectId === context.projectId &&
        item.projectType === type &&
        item.canOperate === true,
    );
    const version = matching.length === 1 ? matching[0].projectVersion : null;
    // end
    if (state.nodeId != null && state.nodeId !== app.nodeId) continue;
    observations.push({
      // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
      ...app,
      ...(typeof version === 'string' &&
        version.trim() &&
        version.length <= 128 && { configuredVersion: version }),
      // end
      // end
      deployed: state.appDeployStatus === 1 ? '已部署' : state.appDeployStatus === 0 ? '未部署' : '未知',
      process:
        state.appStatus === 'running'
          ? '运行中'
          : [0, '0', 'stopped', 'stop', 'idle'].includes(state.appStatus)
            ? '未运行'
            : '未知',
    });
  }
  return observations;
}
// end
