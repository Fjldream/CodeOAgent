// modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
import { randomUUID } from 'node:crypto';
import { HttpError, type Evidence } from './shared.ts';

// VariableEngineer.vue reserves these names. A leading dollar sign alone is not a classification.
const builtinNames = new Set([
  '$Year',
  '$Month',
  '$Day',
  '$Hour',
  '$Minute',
  '$Second',
  '$MilliSecond',
  '$Date',
  '$Time',
  '$DayofWeek',
]);

// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
export function clientVariableRows(payload: unknown) {
  const invalid = () => new HttpError(502, '未能识别 KF 返回的工程变量列表，暂时无法确认变量数量。');
  const groups = (payload as { message?: unknown } | null)?.message;
  if (!Array.isArray(groups)) throw invalid();
  const rows: Record<string, any>[] = [];
  // The native project-level table joins Variables from every returned group.
  for (const entry of groups) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw invalid();
    const containers = Object.values(entry);
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    const group = containers[0];
    if (containers.length !== 1 || !group || typeof group !== 'object' || !('Variables' in group) ||
        !Array.isArray(group.Variables)) throw invalid();
    for (const row of group.Variables) {
      // end
      if (typeof row?.name !== 'string' || !row.name.trim()) throw invalid();
      rows.push(row);
    }
  }
  return rows;
}

export function clientVariableEvidence(payload: unknown): Evidence {
  const variables = clientVariableRows(payload).map((row) => ({
    name: String(row.name),
    builtIn: builtinNames.has(row.name),
    mapped: typeof row.isMap === 'boolean' ? row.isMap : null,
  }));
  // end
  const total = variables.length;
  const builtIn = variables.filter((v) => v.builtIn).length;
  const mapped = variables.filter((v) => v.mapped).length;
  const unknownMapping = variables.filter((v) => v.mapped === null).length;
  const facts = [
    { label: '工程变量总数', value: String(total) },
    { label: 'KF 内置变量', value: String(builtIn) },
    { label: '启用数据源映射', value: String(mapped) },
  ];
  if (unknownMapping) facts.push({ label: '映射状态待核实', value: String(unknownMapping) });
  const preview = variables
    .filter((v) => !v.builtIn)
    .concat(variables.filter((v) => v.builtIn))
    .slice(0, 12);
  if (total)
    facts.push({
      label: total > preview.length ? '变量名称（部分）' : '变量名称',
      value: preview.map((v) => v.name).join('、'),
    });
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    layer: 'saved',
    source: 'client/getVariableList',
    title: '客户端工程 · 工程变量',
    variableInventory: { total, builtIn, mapped, unknownMapping },
    facts,
    gaps: ['工程变量表反映已保存的配置。实时值需在对应运行实例核对。'],
    references: [],
  };
}

export function variableInventoryAnswer(evidence: Evidence) {
  const { total, builtIn, mapped, unknownMapping } = evidence.variableInventory!;
  if (!total) return '当前客户端工程的已保存变量表为空，共 0 个工程变量。';
  const summary =
    '当前客户端工程有 ' +
    total +
    ' 个已保存的工程变量，其中 ' +
    builtIn +
    ' 个是 KF 内置变量，' +
    mapped +
    ' 个启用了数据源映射。' +
    (unknownMapping ? '另有 ' + unknownMapping + ' 个变量的映射状态待核实。' : '');
  const names = evidence.facts.find((f) => f.label.startsWith('变量名称'));
  return [summary, names && names.label + '：' + names.value + '。'].filter(Boolean).join('\n');
}
// end
