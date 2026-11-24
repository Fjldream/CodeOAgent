// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import type { Center } from './center.ts';
import { type Context, type Evidence, HttpError, identifier } from './shared.ts';

// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
export async function reportReference(center: Center, token: string, current: Context, evidence: Evidence,
  resolved?: (definition: any, target: Context, scriptName: string) => void) {
// end
  const member = evidence.reportMember;
  const trails: { path: string; source: string; status: string }[] = [];
  const gaps: string[] = [];
  const depends: Context[] = [];
  if (!member) {
    gaps.push('请选中已保存且绑定数据集字段的单元格。');
    return { trails, gaps, depends };
  }
  const head = member.address + ' → ' + member.name + ' / ' + member.member;
  trails.push({ path: head, source: evidence.id, status: '单元格绑定' });
  const definitions = await center.call(token, '/client/getDataSet', {
    projectId: current.projectId,
    reportId: current.object,
    dataSetInfo: '',
  });
  if (!Array.isArray(definitions)) throw new HttpError(502, '报表数据集目录格式未适配');
  const matches = definitions.filter((d) => d?.reportId === current.object && d.id === member.datasetId);
  if (
    matches.length !== 1 ||
    !Array.isArray(matches[0].tagList) ||
    !matches[0].tagList.includes(member.member)
  ) {
    gaps.push('数据集或字段无法按已保存标识唯一核实。');
    return { trails, gaps, depends };
  }
  const ds = matches[0];
  if (ds.name !== member.name) gaps.push('单元格保留的数据集名称与当前定义不同，已按数据集标识核对。');
  if (ds.type !== 'custom') {
    gaps.push('已核对数据集成员，此类数据集的上游还需另行核对。');
    return { trails, gaps, depends };
  }
  if (
    typeof ds.calculateId !== 'string' ||
    typeof ds.calculateScriptId !== 'string' ||
    !/^[\w-]{1,128}$/.test(ds.calculateId) ||
    !/^[\w-]{1,128}$/.test(ds.calculateScriptId)
  ) {
    gaps.push('自定义数据集缺少有效的工程或脚本标识。');
    return { trails, gaps, depends };
  }
  const target: Context = {
    kind: 'request',
    projectId: identifier(ds.calculateId),
    object: identifier(ds.calculateScriptId),
    dirty: false,
  };
  const unresolved = '当前权限和保存版本下未核实唯一的请求式脚本。';
  if (await center.allowed(token, target)) {
    const scripts = await center.call(token, '/calculation/projectJsonData', {
      projectId: target.projectId,
      type: 'APIs',
      groupId: '-1',
    });
    if (!Array.isArray(scripts)) throw new HttpError(502, '请求式脚本目录格式未适配');
    const found = scripts.filter((s) => s?.GUID === target.object && typeof s.name === 'string');
    if (found.length === 1) {
      depends.push(target);
      if (ds.calculateScript !== found[0].name) {
        gaps.push(
          '报表中保存的调用名与当前脚本名不一致。请在自定义数据集重新选择脚本并保存，再验证运行结果。',
        );
      }
      if (typeof ds.searchCriteria !== 'string' || ds.searchCriteria.length > 65536) {
        gaps.push('查询条件缺失或过长，需在数据集编辑器核对。');
      } else {
        try {
          const query = JSON.parse(ds.searchCriteria);
          if (query?.RequestType !== 'normal')
            gaps.push('查询条件缺少有效的 RequestType。此 KF 版本的请求式计算要求填写 normal。');
        } catch {
          gaps.push('查询条件无法解析为 JSON，请打开自定义数据集修正。');
        }
      }
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
      if (ds.calculateScript === found[0].name) resolved?.(ds, target, found[0].name);
// end
      trails.push({
        path: head + ' → ' + (ds.calculateName || target.projectId) + ' / ' + found[0].name,
        source: 'client/getDataSet.calculateId + calculateScriptId → calculation/projectJsonData.GUID',
        status: '已按工程和脚本标识核对，工程名取自报表配置',
      });
      gaps.push(
        '运行时另行核对查询条件与实际单元格值。关系型回包应含 type=relation 和 data 行数组，行内字段须与所选成员一致。',
      );
    } else gaps.push(unresolved);
  } else gaps.push(unresolved);
  return { trails, gaps, depends };
}
// end
