// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
import type { Center } from './center.ts';
import { calcList } from './calc-config.ts';
import { HttpError, type Context, type Fact } from './shared.ts';

type Source = { guid: string; name: string; type: string };
type Reader = Pick<Center, 'require' | 'call'>;

async function permitted(reader: Reader, token: string, ids: string[]) {
  const allowed = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 50) {
    const chunk = ids.slice(offset, offset + 50);
    const result = await reader.call(token, '/project/permissions', {}, {
      projects: chunk.map(projectId => ({projectId, projectType:3})),
    });
    if (!Array.isArray(result?.items)) throw new HttpError(502, '无法核对数据源工程权限');
    for (const row of result.items) {
      if (Number(row?.projectType) === 3 && row.hasProjectPermission === true && chunk.includes(row.projectId))
        allowed.add(row.projectId);
    }
  }
  return allowed;
}

export async function calcSourceChoices(reader: Reader, token: string, context: Context, exactName?: string) {
  const aliases = (await calcList((path, params) => reader.call(token, path, {...params, projectId:context.projectId}), 'dataAccess', '-1')).items;
  const data = await reader.call(token, '/dataSource/getAllDataSource');
  if (!Array.isArray(data)) throw new HttpError(502, '平台数据源目录格式待核对');
  const directory: Source[] = data.filter(row => row && typeof row.name === 'string' && row.name);
  const aliasTargets = new Set(aliases.filter(a => a.name === exactName).map(a => a.connectName));
  const relevant = directory.filter(row => !exactName || row.name === exactName || aliasTargets.has(row.name));
  const visibleIds = await permitted(reader, token, [...new Set(relevant.map(row => row.guid).filter(id => typeof id === 'string' && id))]);
  const visible = relevant.filter(row => visibleIds.has(row.guid));
  const facts: Fact[] = [];
  const counts = {available:0, linked:0, uncertain:0};
  const ids = new Set<string>();
  for (const row of visible.slice(0,24)) {
    ids.add(row.guid);
    const links = aliases.filter(a => a.connectName === row.name);
    const alias = links[0];
    const ambiguous = directory.filter(other => other.name === row.name).length !== 1 ||
      !row.type || typeof row.type !== 'string' || links.length > 1 ||
      (alias && (alias.type !== row.type || aliases.filter(a => a.name === alias.name).length !== 1));
    if (ambiguous) {
      counts.uncertain++;
      facts.push({label:'需核对',value:row.name+' · 无法唯一匹配名称、类型和工程别名，请先核对平台目录与已保存连接。'});
    } else if (alias) {
      counts.linked++;
      facts.push({label:'已关联',value:row.name+' · '+row.type+' · 工程内名称 '+alias.name+' · 已保存'});
    } else {
      counts.available++;
      facts.push({label:'可选',value:row.name+' · '+row.type+' · 可在「新建」中选择'});
    }
  }
  const gaps: string[] = [];
  if (!facts.length) gaps.push('在本次权限范围内未找到可核对的目标，请检查平台数据源名称或当前账号权限。');
  if (visible.length > 24) gaps.push('仅显示前 24 项，请输入完整平台源名或工程别名缩小范围。');
  const guidance = '在「数据源管理 → 新建」中选择标为可选的平台源，核对自动带出的类型并填写工程内名称。已有连接使用其工程别名。保存后重开列表，在该行执行「测试连接」；成功后还需在目标计算 App 核对一次实际读数。';
  const rechecked = await permitted(reader,token,[...ids]);
  if (rechecked.size !== ids.size) throw new HttpError(403,'数据源权限已变更，请重新查询');
  await reader.require(token,context);
  return {
    title:'计算工程 · 可选与已关联数据源', source:'calculation/projectJsonData · dataSource/getAllDataSource · project/permissions',
    facts, gaps, guidance,
    dependencies:[...ids].map(projectId=>({kind:'datasource' as const,projectId,object:'',dirty:false})),
    summary:{section:'dataAccess' as const, scopedGroup:false, total:visible.length, shown:facts.length, resolved:counts.linked,
      unresolved:counts.uncertain, sourceChoices:counts, guidance, runtimeVerified:false as const},
  };
}
// end
