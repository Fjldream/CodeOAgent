// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
import { HttpError } from './shared.ts';
import { guideBasis, knownBasis, parseGuidance, renderGuidance, type Guidance } from './next-step.ts';
import type { QueryTool } from './query-tools.ts';

export type AnswerSource = {
  kind: 'model-text' | 'model-guide' | 'model-facts' | 'local' | 'system' | 'legacy' | 'legacy-composed';
  model?: string;
  tools?: string[];
  basis?: string[];
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
  pendingClarification?: boolean;
// end
  continuity?: string;
  check?: 'model-review' | 'verified-reference' | 'review-correction' | 'retrospective';
};
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
type FactKey = QueryTool | `history:${QueryTool}` | 'task_memory';
// end

export type ToolText = Partial<Record<FactKey, string>>;
type Result = { answer: string; guidance?: Guidance; source: AnswerSource };

export function sourceTitle(source: AnswerSource) {
  const model = source.model;
  switch (source.kind) {
    case 'model-text':
      return model + ' · 模型撰写';
    case 'model-guide':
      return model + ' · 选用 KF 指引';
    case 'model-facts':
      // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
      if (source.basis?.includes('check_script_drafts')) return model + ' · 模型编写 · KF 静态校验';
      // end
      return model + ' · 引用 KF 查询';
    case 'local':
      return 'KF 本机 · 只读查询';
    case 'system':
      return model ? 'KF 服务提示 · ' + model + ' 未交付答复' : 'KF 助手服务 · 状态提示';
    case 'legacy-composed':
      return 'KF 本机整理 · 已调用 ' + model;
    case 'legacy':
      return '历史回复 · 来源未记录';
  }
}

function decode(text: string) {
  try {
    return JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, ''),
    );
  } catch {
    return null;
  }
}

// modified by jinlong.feng at 2026-11-23 KF意图澄清与续问
export function clarificationQuestion(draft: string): string | undefined {
  const value = decode(draft);
  if (value?.kind !== 'clarify_goal' || typeof value.question !== 'string') return;
  const question = value.question.trim();
  if (!question || question.length > 300 || /[\r\n\x00-\x1f]|\[\[|\]\]/.test(question)) return;
  return question;
}
// end
export async function resolveModelAnswer(
  draft: string,
  facts: ToolText,
  model: string,
  tools: string[],
  hasHistory: boolean,
  review: (draft: string, options: string[], repair: boolean) => Promise<string>,
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
  requiredFact?: FactKey,
// end

): Promise<Result> {
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
  // Only the current run's successful check creates this material. Historical materials
  // have distinct keys. Keep the model-authored deliverable intact through answer review.
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  if (facts.review_solution_script && tools.includes('review_solution_script') && draft.trim()==='[[review_solution_script]]') {
    return {answer:facts.review_solution_script,source:{kind:'model-facts',model,tools,basis:['review_solution_script'],check:'verified-reference',continuity:'已核对本轮计算需求，待开发人员补充或确认口径。'}};
  }
// end
  const checkedScript = facts.check_script_drafts;
  if (tools.includes('check_script_drafts') && checkedScript) {
    return {
      answer: checkedScript,
      source: {kind:'model-facts', model, tools, basis:['check_script_drafts'], check:'verified-reference',
        continuity:'已生成本轮通过 KF 静态检查的完整脚本。部署与执行结果另行核对。'},
    };
  }
  // end
  // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
  // Business decisions may support authored guidance. They are never a tool response
  // to paste into the conversation when the model cannot deliver a grounded answer.
  const references = (Object.keys(facts) as FactKey[]).filter(key => key !== 'task_memory');
  // end
  const options = [...guideBasis, ...references];
  function decision(value: any, corrected: boolean): Result | undefined {
    const check = corrected ? 'review-correction' : 'verified-reference';
    // modified by jinlong.feng at 2026-11-21 KF助手模型统一答复
    if (corrected && (Array.isArray(value?.select) || Array.isArray(value?.choices))) {
      const ids = Array.isArray(value.select)
        ? value.select.map((key: unknown) => (typeof key === 'string' ? options.indexOf(key) : -1))
        : value.choices.map((choice: unknown) =>
            choice && typeof choice === 'object' && 'index' in choice ? choice.index : choice,
          );
      if (
        !ids.length ||
        ids.length > 3 ||
        !ids.every((id: number) => Number.isInteger(id) && id >= 0 && id < options.length)
      )
        return;
      const basis = [...new Set<string>(ids.map((id: number) => options[id]))];
      // end
      const guides: Guidance[] = [];
      const paragraphs = basis.map((key) => {
        if (Object.hasOwn(facts, key)) return facts[key as FactKey];
        const [kind, name] = key.split(':');
        const item = parseGuidance(
          kind === 'step' ? { kind, step: name } : { kind: 'clarify', fields: [name] },
        )!;
        guides.push(item);
        return renderGuidance(item);
      });
      return {
        answer: paragraphs.join('\n\n'),
        guidance: guides[0],
        source: { kind: guides.length ? 'model-guide' : 'model-facts', model, tools, basis, check },
      };
    }
    const guidance = parseGuidance(value);
    if (guidance) {
      const basis =
        guidance.kind === 'step' ? ['step:' + guidance.step] : guidance.fields.map((f) => 'ask:' + f);
      return {
        answer: renderGuidance(guidance),
        guidance,
        source: { kind: 'model-guide', model, tools, basis, check },
      };
    }
    if (value?.kind !== 'facts') return;
    const selected = value.tools ?? references.filter((key) => !key.startsWith('history:'));
    if (
      !Array.isArray(selected) ||
      !selected.length ||
      // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
      !selected.every((k) => references.includes(k))
      // end
    )
      return;
    const basis = Array.from(new Set<FactKey>(selected));
    return {
      answer: basis.map((k) => facts[k]).join('\n\n'),
      source: { kind: 'model-facts', model, tools, basis, check },
    };
  }
  const structured = decode(draft);
  const selected = decision(structured, false);
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
  function grounded(result: Result | undefined) {
    if (!result || !requiredFact) return result;
    const value = facts[requiredFact];
    return value && result.answer.includes(value) ? result : undefined;
  }
  if (grounded(selected)) return selected!;
// end

  const rawText = draft.trim();
  function approved(verdict: any): Result | undefined {
    if (
      verdict?.kind !== 'approve' ||
      !Array.isArray(verdict.basis) ||
      !verdict.basis.length ||
      structured ||
      !rawText ||
      draft.length > 14000 ||
      /^\s*(?:```(?:json)?\s*[{[]|\{|\[(?!\[))|<\|\||<｜｜/.test(draft)
    )
      return;
    let verifiedText = rawText;
    if (verdict.keep !== undefined) {
      const paragraphs = rawText.split(/\n\s*\n/);
      if (
        !Array.isArray(verdict.keep) ||
        !verdict.keep.length ||
        !verdict.keep.every(
          (index: number, i: number) =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < paragraphs.length &&
            (i === 0 || index > verdict.keep[i - 1]),
        )
      )
        return;
      verifiedText = verdict.keep.map((index: number) => paragraphs[index]).join('\n\n');
    }
    // Keep catalog identifiers out of customer prose. Longer walkthroughs require an explicit
    // review decision, so a brief follow-up does not silently expand into a full project plan.
    if (
      /\b(?:step|ask):[A-Za-z][\w-]*/.test(verifiedText) ||
      (verifiedText.length > 400 && verdict.scope !== 'detailed')
    )
      return;
    const basis = [...new Set<string>(verdict.basis)];
    if (
      !basis.every(
        (key) =>
          typeof key === 'string' &&
          (key === 'user' ||
            (key === 'history' && hasHistory) ||
            knownBasis(key) ||
            Object.hasOwn(facts, key)),
      )
    )
      return;
    const slots = /\[\[([^\]]+)\]\]/g;
    const keys = [...verifiedText.matchAll(slots)].map((match) => match[1]);
    if (
      verifiedText.split('\n').some((line) => line.includes('[[') && !/^\[\[[^\]]+\]\]$/.test(line.trim())) ||
      /\[\[|\]\]/.test(verifiedText.replace(slots, '')) ||
      // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
      keys.some((key) => !references.includes(key as FactKey) || !basis.includes(key))
      // end
    )
      return;
    const answer = verifiedText.replace(slots, (_match, key: FactKey) => facts[key]!);
    const guidance = parseGuidance(verdict.guidance) ?? undefined;
    return {
      answer,
      guidance,
      source: {
        kind: 'model-text',
        model,
        tools,
        basis,
        check: 'model-review',
        continuity: verifiedText.slice(0, 1200),
      },
    };
  }
  for (const repair of [false, true]) {
    const verdict = decode(await review(draft, options, repair));
    if (verdict?.kind === 'unverified') break;
    // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    // A reviewer can recover a missing business question. Verify the new wording
    // through the same review contract used for questions authored on the first pass.
    if (!repair && !requiredFact && verdict?.kind === 'clarify_goal' && !clarificationQuestion(draft)) {
      const proposed = JSON.stringify(verdict);
      const question = clarificationQuestion(proposed);
      if (question && decode(await review(proposed, options, false))?.kind === 'approve_clarification') {
        return {answer:question, source:{kind:'model-text',model,tools,basis:['user'],
          check:'review-correction',pendingClarification:true,continuity:question}};
      }
    }
    // end
// modified by jinlong.feng at 2026-11-23 KF意图澄清与续问
    const clarification = clarificationQuestion(draft);
    if (!repair && clarification && verdict?.kind === 'approve_clarification') {
      return { answer: clarification, source: {kind:'model-text', model, tools,
        basis:['user', ...(hasHistory ? ['history'] : [])], check:'model-review',
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
        pendingClarification:true, continuity: clarification} };
// end

    }
// end
    const checked = decision(verdict, true) ?? (!repair ? approved(verdict) : undefined);
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
    if (grounded(checked)) return checked!;
// end

  }
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
  if (requiredFact && facts[requiredFact]) return {
    answer: facts[requiredFact]!, source: {kind:'local', tools:[requiredFact], basis:[requiredFact]},
  };
// end
  throw new HttpError(422, '本轮答复缺少可核验的依据。请补充实际配置或操作结果后重试。');
}
// end
