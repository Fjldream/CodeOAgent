// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
import { createHash } from "node:crypto";
import { HttpError, type Context } from "./shared.ts";
import { calcScope, calcList } from "./calc-config.ts";
import type { Center } from "./center.ts";
import type { Store } from "./store.ts";

export const dependencyGuides = {
  npm: "JavaScript → npm 依赖 → 安装，填写 npm 包名或包名@版本，点下载并复查清单。用户包在工程脚本使用 require(包名)；系统包使用 Common/project.json 中的 execPath 下的 node_modules。安装规格和实际加载版本分别核对。",
  normal:
    'JavaScript → 普通依赖 → 导入 ZIP。单文件选 .js，多文件在 ZIP 根放 index.js。脚本以 require("./normal_modules/JS/登记名/入口") 引用；同包资源按入口目录定位。发布部署后核对目标 App 的真实路径及有界读取结果。',
  python:
    "Python → Python 依赖 → 导入 ZIP。单文件选 .py，多文件在 ZIP 根放 index.py。文件部署到 normal_modules/Python/登记名/入口。JS 使用 path.join(__dirname, ...) 定位，通过 execFile 或 spawn 调用节点解释器，检查启动错误、退出状态与导入结果。导入 ZIP 不会自动安装 pip 包。",
};
export type DependencyKind = keyof typeof dependencyGuides;
export function dependencyKind(value: unknown): value is DependencyKind {
  return typeof value === "string" && Object.hasOwn(dependencyGuides, value);
}
const invalid = (message: string) => new HttpError(409, message);
type Definition = {
  kind: DependencyKind;
  name: string;
  type: string;
  file: string;
  member: string;
  signature: string;
};
function plain(value: string) {
  return (
    /^[\p{L}\p{N}_-][\p{L}\p{N} _.-]{0,127}$/u.test(value) &&
    !value.endsWith(".") &&
    !value.endsWith(" ")
  );
}
export function dependencyDefinition(
  kind: DependencyKind,
  row: any,
  member = "",
): Definition {
  if (typeof member !== "string" || member.length > 128)
    throw invalid("依赖文件名无效。");
  if (kind === "npm") {
    if (
      member ||
      !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*(?:@[a-zA-Z0-9._~^*-]+)?$/.test(
        row.name,
      )
    )
      throw invalid("此安装规格需要单独核对实际导入包名。");
  } else if (
    !plain(row.name) ||
    !plain(String(row.fileName || "")) ||
    !String(row.fileName).endsWith(kind === "python" ? ".py" : ".js") ||
    (member &&
      (!plain(member) || (kind === "python" && !member.endsWith(".py"))))
  )
    throw invalid("请选择登记的有效入口和同一归档内的文件名。");
  const file = String(row.fileName || "");
  return {
    kind,
    name: row.name,
    type: row.type,
    file,
    member: member || file,
    signature: createHash("sha256")
      .update(JSON.stringify([kind, row.name, row.type, file]))
      .digest("hex"),
  };
}
export async function dependencyList(
  center: Center,
  token: string,
  ctx: Context,
  kind: DependencyKind,
) {
  await center.require(token, ctx);
  const { items } = await calcList(
    (path, q) => center.call(token, path, { ...q, projectId: ctx.projectId }),
    kind,
    "-1",
  );
  return items;
}
const pyCheck = [
  "import importlib.util, json, os, platform, sys",
  "path = sys.argv[1]",
  'result = {"interpreter": sys.executable, "version": platform.python_version(), "path": path, "ok": False}',
  "try:",
  "    sys.path.insert(0, os.path.dirname(path))",
  "    name = os.path.splitext(os.path.basename(path))[0]",
  "    spec = importlib.util.spec_from_file_location(name, path)",
  "    module = importlib.util.module_from_spec(spec)",
  "    sys.modules[name] = module",
  "    spec.loader.exec_module(module)",
  "    result.update(ok=True, imported=module.__name__, path=module.__file__)",
  "except Exception as exc:",
  '    result.update(error=type(exc).__name__, missing=getattr(exc, "name", None))',
  "print(json.dumps(result))",
].join("\n");
export function dependencyProbe(d: Definition) {
  const literal = JSON.stringify;
  const block =
    d.kind === "npm"
      ? [
          "const pkg = " +
            literal(
              d.name.slice(
                0,
                d.name.indexOf("@", 1) < 0 ? undefined : d.name.indexOf("@", 1),
              ),
            ) +
            ";",
          "const base = " +
            (d.type === "system"
              ? 'path.join(require("./Common/project.json").execPath, "node_modules", pkg)'
              : "pkg") +
            ";",
          "const entry = require.resolve(base);",
          "require(base);",
          "let dir = path.dirname(entry);",
          "for (;;) {",
          '  const meta = path.join(dir, "package.json");',
          "  if (fs.existsSync(meta)) {",
          '    const manifest = JSON.parse(fs.readFileSync(meta, "utf8"));',
          "    if (manifest.name === pkg) { result.version = manifest.version; break; }",
          "  }",
          '  if (path.dirname(dir) === dir) throw Object.assign(new Error(), { code: "MANIFEST_UNRESOLVED" });',
          "  dir = path.dirname(dir);",
          "}",
          "result.path = entry;",
          'result.expected = typeof InParam.expectedVersion === "string" ? InParam.expectedVersion.slice(0,80) : "";',
          "result.ok = !result.expected || result.version === result.expected;",
          'if (!result.ok) result.error = "VERSION_MISMATCH";',
        ]
      : [
          'const dir = path.join(__dirname, "normal_modules", ' +
            literal(d.kind === "normal" ? "JS" : "Python") +
            ", " +
            literal(d.name) +
            ");",
          "const target = path.join(dir, " + literal(d.member) + ");",
          "result.path = target;",
          'if (fs.existsSync(target) && fs.realpathSync(target) !== path.join(fs.realpathSync(__dirname), "normal_modules", ' +
            literal(d.kind === "normal" ? "JS" : "Python") +
            ", " +
            literal(d.name) +
            ", " +
            literal(d.member) +
            ')) throw Object.assign(new Error(), {code:"PATH_CHANGED"});',
          ...(d.kind === "normal"
            ? [
                'const fd = fs.openSync(target, "r");',
                "try {",
                "  const bytes = Buffer.alloc(160);",
                "  const count = fs.readSync(fd, bytes, 0, bytes.length, 0);",
                "  result.bytes = fs.fstatSync(fd).size;",
                '  result.preview = bytes.subarray(0,count).toString("utf8");',
                "  result.ok = true;",
                "} finally { fs.closeSync(fd); }",
              ]
            : [
                'const run = require("util").promisify(require("child_process").execFile);',
                'for (const executable of ["python3","python"]) {',
                "  try {",
                '    const child = await run(executable, ["-I","-B","-c",' +
                  literal(pyCheck) +
                  ",target], {timeout:5000,maxBuffer:32768});",
                "    const lines = child.stdout.trim().split(/\\r?\\n/);",
                "    Object.assign(result,JSON.parse(lines[lines.length-1]));",
                "    break;",
                '  } catch (e) { if (e.code !== "ENOENT" || executable === "python") throw e; }',
                "}",
              ]),
        ];
  return [
    'const path = require("path");',
    'const fs = require("fs");',
    "const result = {kind:" +
      literal(d.kind) +
      ", name:" +
      literal(d.name) +
      ", member:" +
      literal(d.member) +
      ", ok:false};",
    "try {",
    ...block.map((l) => "  " + l),
    '} catch (e) { result.ok = false; result.error = String(e.code || e.name || "ERROR").slice(0,100); }',
    "OutParam.dependency = result;",
    "endResponse(RequestID);",
  ].join("\n");
}
export function checkedDependency(d: Definition, raw: any, input: any) {
  const text = (v: any) =>
    typeof v === "string" && v.length > 0 && v.length <= 2048;
  if (
    !raw ||
    raw.kind !== d.kind ||
    raw.name !== d.name ||
    raw.member !== d.member ||
    typeof raw.ok !== "boolean"
  )
    throw invalid("实际回包与声明依赖不一致。");
  if (!raw.ok && !text(raw.error)) throw invalid("缺少失败回执。");
  if (raw.ok || raw.error === "VERSION_MISMATCH") {
    if (
      !text(raw.path) ||
      (d.kind === "npm" &&
        (!text(raw.version) ||
          raw.expected !==
            (typeof input?.expectedVersion === "string"
              ? input.expectedVersion.slice(0, 80)
              : "") ||
          raw.ok !== (!raw.expected || raw.expected === raw.version))) ||
      (d.kind === "normal" &&
        (!Number.isSafeInteger(raw.bytes) ||
          raw.bytes < 0 ||
          typeof raw.preview !== "string" ||
          raw.preview.length > 160)) ||
      (d.kind === "python" &&
        (!text(raw.interpreter) || !text(raw.version) || !text(raw.imported)))
    )
      throw invalid("缺少该类依赖加载的实际字段。");
  }
  const fields = [
    "kind",
    "name",
    "member",
    "ok",
    "error",
    "path",
    "version",
    "expected",
    "bytes",
    "preview",
    "interpreter",
    "imported",
    "missing",
  ];
  const result: Record<string, unknown> = {};
  for (const k of fields)
    if (Object.hasOwn(raw, k)) {
      const v = raw[k];
      if (
        !(
          v === null ||
          typeof v === "boolean" ||
          (typeof v === "string" && v.length <= 2048) ||
          Number.isSafeInteger(v)
        )
      )
        throw invalid("回执字段类型异常。");
      result[k] = v;
    }
  return result;
}
export async function dependencyReport(
  center: Center,
  store: Store,
  owner: string,
  token: string,
  chat: string,
  ctx: Context,
  kind: DependencyKind,
  name: string | undefined,
  member: string | undefined,
  permitted: (r: any) => Promise<boolean>,
) {
  store.chat(owner, chat);
  calcScope(ctx, kind);
  const items = await dependencyList(center, token, ctx, kind),
    selection = items.filter((r) => !name || r.name === name);
  const lines = [
    dependencyGuides[kind],
    ...selection
      .slice(0, 24)
      .map(
        (r) =>
          "已登记 · " +
          r.name +
          " · " +
          r.type +
          (r.fileName ? " · 入口 " + r.fileName : ""),
      ),
  ];
  if (!selection.length) lines.push("当前工程未查到匹配的已登记依赖。");
  const dependencies: Context[] = [];
  let count = 0,
    failed = 0,
    history = 0;
  const rows = store.db
    .prepare(
      "SELECT * FROM calc_captures WHERE project=? AND chat=? AND json_extract(result,'$.dependency.kind')=? ORDER BY rowid DESC",
    )
    .all(ctx.projectId, chat, kind);
  for (const row of rows) {
    const result = JSON.parse(String(row.result)),
      d = result.dependency;
    if (
      (name && d.name !== name) ||
      (member && d.member !== member) ||
      !(await permitted(row))
    )
      continue;
    const matches = items.filter((r) => r.name === d.name);
    const same =
      matches.length === 1 &&
      dependencyDefinition(kind, matches[0], kind === "npm" ? "" : d.member)
        .signature === d.signature;
    if (same) {
      count++;
      if (!d.reading.ok) failed++;
    } else history++;
    lines.push(
      (same ? "采样时登记与当前一致" : "历史登记") +
        " · " +
        result.appName +
        " · " +
        d.at +
        " · " +
        (d.reading.ok ? "成功" : "失败") +
        " · " +
        JSON.stringify(d.reading),
    );
    dependencies.push(...JSON.parse(String(row.dependencies)));
  }
  if (!count)
    lines.push(
      "当前登记没有匹配的 App 实测。可按完整登记名获取核对正文，保存到请求式脚本并部署后关联一次真实回包。",
    );
  let probe = "";
  if (name && selection.length === 1) {
    try {
      probe = dependencyProbe(dependencyDefinition(kind, selection[0], member));
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      lines.push(e.message);
    }
  }
  if (
    !(await permitted({
      context: JSON.stringify(ctx),
      dependencies: JSON.stringify(dependencies),
    }))
  )
    throw new HttpError(403, "关联工程权限已变更。");
  return {
    lines,
    probe,
    dependencies,
    summary: {
      registered: selection.length,
      observed: count,
      failed,
      historical: history,
    },
  };
}
// end
