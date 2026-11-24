// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
import type { Review } from "./solution-script.ts";

type ObjectName = { name: string; kind: string };
export type ReviewConstraints = {
  outputs: string[];
  hosts: string[];
  reuseOnly: boolean;
  namedVariables: string[];
  unresolvedOutput: boolean;
};
const hostTypes: [string, RegExp][] = [
  ["request", /请求式(?:计算)?(?:脚本)?|请求脚本/u],
  ["period", /周期(?:性)?(?:计算)?脚本/u],
  ["dataChange", /数据(?:改变|变化)脚本/u],
  ["condition", /条件事件脚本/u],
  ["system", /系统事件脚本|系统脚本/u],
];
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
const writeBefore =
  /(?:写[入回到]|(?:写回|输出)(?:目标|变量)(?:从[^，。；]{1,80}?)?(?:改为|改成|换成|改用|换为)|存[入到]|保存(?:在|至|到)|缓存(?:至|到)|输出(?:到|至)|放(?:在|到)|写回(?:目标)?|结果变量|写入目标)(?:到|至|为|是|改为|改成|换成|换为)?(?:工程内的?|工程)?(?:缓存变量|词典变量|变量|缓存)?[\s“「`：:]*$/u;
// end
const writeAfter =
  /^[\s”」`]*(?:用作|作为|是|为)(?:本次|指定的|结果的?|我在首轮指定的)*(?:写回目标|输出变量|结果缓存|缓存变量|输出目标)/u;
const functionCreation =
  /(?:新建|新增|编写|生成|定义|创建)(?:一[个段支])?(?:新的?)?自定义函数/u;

export function reviewConstraints(
  question: string,
  bindings: Map<string, ObjectName>,
  prior?: ReviewConstraints,
): ReviewConstraints {
  const mentioned = new Set<string>(),
    outputs = new Set<string>();
  // A token must identify an entire project object, including names with common prefixes.
  const clauses = question.split(/[，,。；;！？\n]/u);
  let unknownOutput = false;
  const knownNames = new Set([...bindings.values()].map((b) => b.name));
  for (const clause of clauses) {
    for (const target of clause.matchAll(
      /(?:写入|写回|保存到|保存在|存入)\s*(?:缓存变量|词典变量|变量)?\s*(?:[「“`]|)([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/gu,
    )) {
      if (
        !/^(?:OutParam|InParam)\./.test(target[1]) &&
        !knownNames.has(target[1])
      )
        unknownOutput = true;
    }
    for (const [ref, binding] of bindings) {
      if (binding.kind !== "variable" || !binding.name) continue;
      const escaped = binding.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const token = new RegExp(
        "(?<![A-Za-z0-9_$])" + escaped + "(?![A-Za-z0-9_$])",
        "gu",
      );
      for (const match of clause.matchAll(token)) {
        mentioned.add(ref);
        const prefix = clause.slice(0, match.index);
        const suffix = clause.slice(match.index + binding.name.length);
        // The same write verb may govern a list of names joined by 、 or 和.
        const listPrefix = prefix.replace(
          /(?:[A-Za-z_$][\w$]*\s*(?:、|和|及|与)\s*)+$/u,
          "",
        );
        if (
          (writeBefore.test(listPrefix) || writeAfter.test(suffix)) &&
          !/(?:不要|不再|禁止|不能|无需|勿|不)(?:再)?[^，。；]{0,6}(?:写|存|输出)\S{0,3}$/u.test(
            listPrefix,
          )
        )
          outputs.add(ref);
      }
    }
  }
  const hosts = hostTypes
    .filter(([, pattern]) =>
      clauses.some((clause) => {
        const match = pattern.exec(clause);
        if (!match) return false;
        const before = clause.slice(0, match.index).trimEnd();
        return !/(?:查看|读取|参考|复用|调用|已有|现有|不要|无需|不生成|不新建)(?:已保存的?|现有的?|已有的?|的|生成|新建|一个)*$/u.test(
          before,
        );
      }),
    )
    .map(([host]) => host);
  const createFunction = clauses.some(
    (c) =>
      functionCreation.test(c) &&
      !/(?:不|无需|不要)(?:再)?(?:新建|新增|生成|创建|定义)/u.test(c),
  );
  if (createFunction) hosts.push("customFunction");
  const extend = /(?:另[加增]|追加|增加|再加|同时写)/u.test(question);
  const combine = (next: string[], previous: string[] = []) =>
    next.length
      ? [...new Set([...(extend ? previous : []), ...next])]
      : [...previous];
  return {
    unresolvedOutput:
      unknownOutput || (!outputs.size && !!prior?.unresolvedOutput),
    hosts: combine(hosts, prior?.hosts),
    outputs: combine([...outputs], prior?.outputs),
    namedVariables: [
      ...new Set([...(prior?.namedVariables ?? []), ...mentioned]),
    ],
    reuseOnly:
      !createFunction &&
      (/(?:复用|调用|使用|用)(?:工程内?|已启用的?|已登记的?|已有的?|现成的?|现有的?){1,4}[^，。；]{0,18}函数/u.test(
        question,
      ) ||
        !!prior?.reuseOnly),
  };
}

export function reviewDiagnostics(
  review: Review,
  constraints: ReviewConstraints,
) {
  const issues: string[] = [];
  const selected = review.outputs.filter((ref) => ref.startsWith("@variable:"));
  const expected = constraints.outputs;
  if (
    constraints.unresolvedOutput &&
    (!review.missing || selected.some((ref) => !expected.includes(ref)))
  ) {
    issues.push(
      "用户点名的写回对象尚未在可读工程中匹配，保留已核对的对象并追问缺失目标，不能用其他变量替代。",
    );
  }
  if (
    expected.length &&
    (expected.some((ref) => !selected.includes(ref)) ||
      selected.some((ref) => !expected.includes(ref)))
  ) {
    issues.push(
      "outputs 中的变量必须与用户点名的写回目标完全一致：" +
        expected.join("、") +
        "。把缓存写在 outputs，输入只列需要读取的对象。",
    );
  } else if (
    !expected.length &&
    constraints.namedVariables.length &&
    selected.some((ref) => !constraints.namedVariables.includes(ref))
  ) {
    issues.push(
      "写回变量与用户提及的变量缺少对应依据。请核对角色，若无法确定，清空猜测的输出并追问写回目标。",
    );
  }
  if (
    constraints.hosts.length &&
    (constraints.hosts.some((h) => !review.hosts.includes(h)) ||
      review.hosts.some((h) => !constraints.hosts.includes(h)))
  ) {
    issues.push(
      "hosts 只填写要新生成的脚本：" +
        constraints.hosts.join("、") +
        "。已登记的函数放在 functions。",
    );
  }
  if (
    constraints.reuseOnly &&
    (review.hosts.includes("customFunction") ||
      (!review.functions.length && !review.missing))
  ) {
    issues.push(
      "用户要求复用已有函数，请在 functions 选择已登记的函数引用；无需生成函数定义。",
    );
  }
  return issues;
}
// end
