// modified by jinlong.feng at 2026-11-20 KF开发助手M1
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import type { Evidence } from './shared.ts';
import { describeScene } from './scene-observation.ts';
// end

export function compareInputs(current: Evidence, prior?: Evidence) {
  if (!prior || !prior.references.some((ref) => current.references.includes(ref))) return '';
  return '两处已保存配置含有相同的输入引用。依据 ' + prior.id + ' 和 ' + current.id + '。';
}

const sections = ['facts', 'comparison', 'verify'] as const;
type Section = (typeof sections)[number];

export function guidedSections(response: string): Section[] {
  try {
    const plan = JSON.parse(response);
    if (Array.isArray(plan.sections)) {
      const allowed = sections.filter((key) => plan.sections.includes(key));
      if (allowed.length) return allowed;
    }
  } catch {
    /* Free-form model instructions do not enter the customer-visible answer. */
  }
  return [...sections];
}

export function evidenceGuide(e: Evidence, prior: Evidence | undefined, modelReply: string) {
  const selected = guidedSections(modelReply);
  const result = ['已保存配置 · ' + e.title + '\n证据 ' + e.id];
  if (selected.includes('facts')) result.push(...e.facts.map((field) => field.label + '：' + field.value));
  if (selected.includes('comparison')) {
    const comparison = compareInputs(e, prior);
    if (comparison) result.push(comparison);
  }
  if (selected.includes('verify'))
    result.push('在本条答复下展开“查看已保存配置证据”，按字段核对来源和点名。');
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  return [...result, ...e.gaps, describeScene(e.sceneView)].filter(Boolean).join('\n');
  // end
}
// end
