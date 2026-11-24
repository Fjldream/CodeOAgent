// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import {
  dependencyDefinition,
  dependencyProbe,
  checkedDependency,
  dependencyReport,
} from "../src/dependency.ts";
import { Store } from "../src/store.ts";
import type { Center } from "../src/center.ts";
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "kf-dependency-"));
  async function store(path: string, text: string) {
    const target = join(dir, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, text);
  }
  async function run(
    kind: "npm" | "normal" | "python",
    name: string,
    fileName: string,
    member = "",
    input = {},
  ) {
    const def = dependencyDefinition(
      kind,
      { name, fileName, type: kind === "npm" ? "user" : kind },
      member,
    );
    const out: any = {};
    const runnable = Object.getPrototypeOf(async function () {}).constructor;
    await new runnable(
      "require",
      "__dirname",
      "InParam",
      "OutParam",
      "RequestID",
      "endResponse",
      dependencyProbe(def),
    )(createRequire(join(dir, "demo.cjs")), dir, input, out, 1, () => {});
    return checkedDependency(def, out.dependency, input);
  }
  return {
    dir,
    store,
    run,
    clean: () => rm(dir, { recursive: true, force: true }),
  };
}
test("npm 从工程实际加载带作用域的包，区分正确版本、不兼容与缺包", async () => {
  const f = await fixture();
  try {
    await f.store(
      "node_modules/@unit/out/package.json",
      JSON.stringify({ name: "@unit/out", version: "2.1.0", main: "index.js" }),
    );
    await f.store("node_modules/@unit/out/index.js", "module.exports=7;");
    assert.equal(
      (
        await f.run("npm", "@unit/out@2.1.0", "", "", {
          expectedVersion: "2.1.0",
        })
      ).version,
      "2.1.0",
    );
    assert.equal(
      (
        await f.run("npm", "@unit/out@2.1.0", "", "", {
          expectedVersion: "1.0.0",
        })
      ).error,
      "VERSION_MISMATCH",
    );
    assert.equal(
      (await f.run("npm", "never-installed-test-pkg", "")).error,
      "MODULE_NOT_FOUND",
    );
  } finally {
    await f.clean();
  }
});
test("普通文件只读登记包内，含实际路径、长度、预览与缺失错误", async () => {
  const f = await fixture();
  try {
    await f.store("normal_modules/JS/Test/index.js", "exports.value=1;");
    await f.store("normal_modules/JS/Test/unit.txt", "scale=100");
    const r = await f.run("normal", "Test", "index.js", "unit.txt");
    assert.equal(r.preview, "scale=100");
    assert.equal(r.bytes, 9);
    assert.equal(r.path, join(f.dir, "normal_modules/JS/Test/unit.txt"));
    assert.equal(
      (await f.run("normal", "Test", "index.js", "gone.txt")).error,
      "ENOENT",
    );
    assert.throws(() =>
      dependencyDefinition(
        "normal",
        { name: "Test", fileName: "index.js" },
        "../outside",
      ),
    );
  } finally {
    await f.clean();
  }
});
test("Python 在一次进程内取得解释器和导入结果，导入失败仍保留解释器证据", async () => {
  const f = await fixture();
  try {
    await f.store(
      "normal_modules/Python/Lib/index.py",
      "from helper import value",
    );
    await f.store("normal_modules/Python/Lib/helper.py", "value=3");
    await f.store(
      "normal_modules/Python/Lib/missing.py",
      "import no_such_kf_dependency_qxyz",
    );
    const success = await f.run("python", "Lib", "index.py");
    assert.ok(success.interpreter);
    assert.ok(success.version);
    assert.equal(success.imported, "index");
    const failure = await f.run("python", "Lib", "index.py", "missing.py");
    assert.equal(failure.ok, false);
    assert.equal(failure.error, "ModuleNotFoundError");
    assert.equal(success.interpreter, failure.interpreter);
  } finally {
    await f.clean();
  }
});
test("工程清单和对话隔离，空清单无运行结论，伪成功缺字段拒收", async () => {
  const store = new Store(":memory:"),
    { chatId } = store.createPlan("one", "p");
  const center = {
    require: async () => {},
    call: async () => [],
  } as unknown as Center;
  const ctx = {
    kind: "calculation" as const,
    projectId: "P",
    dirty: false,
    object: "",
  };
  const report = (owner: string, permit: boolean) =>
    dependencyReport(
      center,
      store,
      owner,
      "t",
      chatId,
      ctx,
      "npm",
      undefined,
      undefined,
      async () => permit,
    );
  assert.equal((await report("one", true)).summary.observed, 0);
  await assert.rejects(report("two", true));
  await assert.rejects(report("one", false));
  const d = dependencyDefinition("npm", { name: "a", type: "user" });
  assert.throws(() => checkedDependency(d, { ...d, ok: true }, {}));
});
// end
