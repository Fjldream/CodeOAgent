// modified by jinlong.feng at 2026-11-21 KF开发助手能力盘点
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const { parse } = createRequire(path.join(root, 'dev/agent/package.json'))('acorn');
const center = 'kf-reference/KingFusion3.6_Center/kingdevopscenter';
const nodeRuntime = 'kf-reference/KingFusion3.6_Node/kingexedb';
const native = center + '/kingclient/exe/public/javascripts';
const matrix = 'docs/KF_DEVELOPMENT_ASSISTANT_CAPABILITIES.md';
const index = 'docs/KF_DEVELOPMENT_ASSISTANT_SOURCE_INDEX.md';
const routeFiles = ['devFront/src/router/index.js', 'devFront/src/router/asyncRoutes.js'];
const grades = ['实', '限', '缺', '免'];
const methods = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all']);
const sorted = (items) => [...new Set(items)].sort();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const inline = (value) => '`' + value + '`';

function link(file, label = path.basename(file), line = 0) {
  if (!fs.existsSync(path.join(root, file))) throw new Error('证据路径不存在 ' + file);
  const target = encodeURI(path.posix.relative('docs', file)) + (line ? '#L' + line : '');
  return '[' + label + '](' + target + ')';
}

function listFiles(dir, accept, recursive = false) {
  const files = [];
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const name = dir + '/' + item.name;
    if (recursive && item.isDirectory()) files.push(...listFiles(name, accept, true));
    if (item.isFile() && accept(item.name)) files.push(name);
  }
  return files.sort();
}

function ast(file) {
  const source = read(file);
  return parse(file.endsWith('.ts') ? stripTypeScriptTypes(source) : source, {
    ecmaVersion: 'latest', locations: true, sourceType: 'module',
  });
}

function* walk(node) {
  if (!node?.type) return;
  yield node;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) yield* walk(child);
    } else if (value?.type) {
      yield* walk(value);
    }
  }
}

const key = (property) => property.key?.name ?? property.key?.value;
const property = (node, name) => node.properties?.find((item) => key(item) === name)?.value;
const literal = (node) => typeof node?.value === 'string' ? node.value : null;

function discoverRoutes() {
  const routes = new Map();
  for (const file of routeFiles) {
    for (const obj of walk(ast(file))) {
      const name = literal(property(obj, 'path'));
      if (!name || obj.type !== 'ObjectExpression') continue;
      if (routes.has(name)) throw new Error('路由键出现重复，需要用父路由消歧 ' + name);
      const component = [...walk(property(obj, 'component'))].find((item) => item.type === 'ImportExpression');
      const view = literal(component?.source)?.replace(/^@\//, 'devFront/src/');
      if (property(obj, 'component') && !view) throw new Error('需审阅动态组件 ' + name);
      routes.set(name, { file, line: obj.loc.start.line, view });
    }
  }
  return routes;
}

function readAssessment() {
  const coverage = new Map();
  const actions = [];
  let group = '';
  for (const line of read(matrix).split('\n')) {
    // modified by jinlong.feng at 2026-11-24 KF开发助手公开仓库交付
    if (line.startsWith('### ')) group = line.slice(4);
    if (line.startsWith('## 按客户从空工程')) group = '方案起步';
    // end
    if (!line.startsWith('| ')) continue;
    const cells = line.split('|').slice(1, -1).map((value) => value.trim());
    if (cells[0] === '边界') {
      addKeys(cells.at(-1), '导航与权限');
    } else if (cells.length === 6 && !['客户动作', '---'].includes(cells[0])) {
      if (!cells.slice(1, 4).every((grade) => grades.includes(grade))) throw new Error('未知评级 ' + cells[0]);
      actions.push({ group, grades: cells.slice(1, 4) });
      addKeys(cells[5], cells[0]);
    }
  }
  if (!actions.length) throw new Error('能力清单中未找到客户动作');
  return { coverage, actions };

  function addKeys(cell, action) {
    const keys = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    if (!keys.length) throw new Error('缺少路由键 ' + action);
    // modified by jinlong.feng at 2026-11-24 KF开发助手公开仓库交付
    const entryRoutes = {
      calculation: 'calculate-engineer-config',
      period: 'calculate-period-script',
      request: 'calculate-askcalculate-script',
      page: 'client-page-management',
    };
    for (const key of keys) {
      const name = Object.hasOwn(entryRoutes, key) ? entryRoutes[key] : key;
      if (!coverage.has(name)) coverage.set(name, []);
      const actions = coverage.get(name);
      if (!actions.includes(action)) actions.push(action);
    }
    // end
  }
}

function menuItems(file) {
  const items = [];
  for (const obj of walk(ast(file))) {
    for (const field of ['path', 'showPath']) {
      const name = literal(property(obj, field));
      if (name) items.push(name);
    }
  }
  return sorted(items);
}

function apiExports(file) {
  const symbols = [];
  for (const node of ast(file).body) {
    if (node.type !== 'ExportNamedDeclaration') continue;
    const declarations = node.declaration?.declarations ?? (node.declaration ? [node.declaration] : []);
    for (const decl of declarations) {
      if (!decl.id?.name) throw new Error('待审阅的前端导出形式 ' + file);
      const calls = [];
      for (const call of walk(decl)) {
        if (call.type !== 'CallExpression' || call.callee.object?.name !== 'axiosRequest') continue;
        const method = call.callee.property.name;
        const arg = call.arguments[0];
        const endpoint = literal(arg) ?? (arg?.type === 'TemplateLiteral'
          ? arg.quasis.map((part) => part.value.raw).join('{…}') : '{动态路径}');
        calls.push(method.toUpperCase() + ' ' + endpoint);
      }
      symbols.push(decl.id.name + (calls.length ? ' → ' + sorted(calls).join('、') : ''));
    }
    symbols.push(...node.specifiers.map((item) => item.exported.name));
  }
  return sorted(symbols);
}

// Read the registrations as syntax only. No KF service, router or customer module is imported.
function configuredEndpoints(file) {
  const tree = ast(file);
  const exported = [...walk(tree)].find((node) => node.type === 'AssignmentExpression'
    && node.left.object?.name === 'module' && node.left.property?.name === 'exports');
  if (exported?.right.type !== 'ObjectExpression') throw new Error('待审阅的后端登记格式 ' + file);
  const result = [];
  for (const group of exported.right.properties) {
    const method = key(group);
    if (!methods.has(method) || group.value.type !== 'ObjectExpression') throw new Error('未知方法组 ' + file);
    for (const item of group.value.properties) {
      const route = literal(item.key);
      if (!route) throw new Error('动态接口登记 ' + file);
      result.push(method.toUpperCase() + ' ' + route);
    }
  }
  return sorted(result);
}

function collectionEndpoints(file) {
  const result = [];
  for (const call of walk(ast(file))) {
    if (call.type !== 'CallExpression' || call.callee.object?.name !== 'router') continue;
    const method = call.callee.property?.name;
    if (!methods.has(method)) continue;
    const route = literal(call.arguments[0]);
    if (!route) throw new Error('数采接口需要复核 ' + file);
    result.push(method.toUpperCase() + ' ' + route);
  }
  return sorted(result);
}

function objectKeys(file, name) {
  const decl = [...walk(ast(file))].find((node) => node.type === 'VariableDeclarator' && node.id.name === name);
  if (decl?.init?.type !== 'ObjectExpression') throw new Error('未找到登记表 ' + file + ' ' + name);
  return sorted(decl.init.properties.map(key));
}

function generate() {
  const { coverage, actions } = readAssessment();
  const routes = discoverRoutes();
  const issues = [];
  const lines = [
    '<!-- modified by jinlong.feng at 2026-11-21 KF开发助手能力盘点 -->',
    '# KF 开发助手源码索引与覆盖统计', '',
    '由 ' + link('scripts/audit-kf-assistant-capabilities.mjs') + ' 离线生成。能力分级及下一项开发的验收条件见' + link(matrix, '客户动作对照表') + '。', '',
    '## 按客户动作统计', '',
    '共审阅 **' + actions.length + ' 组客户动作**。同一行可能覆盖几个同类菜单；一行按一个动作组计数。每格依次列出「实 / 限 / 缺 / 免」的组数。', '',
    '| 领域 | 动作组 | 操作指导 | 读取配置 | 核验运行 |', '| --- | ---: | --- | --- | --- |',
  ];
  function countRow(group, items) {
    const counts = [0, 1, 2].map((i) => grades.map((grade) => items.filter((a) => a.grades[i] === grade).length).join(' / '));
    lines.push('| ' + [group, items.length, ...counts].join(' | ') + ' |');
  }
  for (const group of new Set(actions.map((row) => row.group))) countRow(group, actions.filter((row) => row.group === group));
  countRow('合计', actions);

  lines.push('', '## 开发中心路由和对应审阅项', '', '从基础路由、异步路由和动态挂载的主容器取得 ' + routes.size + ' 个静态路径键。角色和安装配置共同决定可见菜单。缺少归属的新路由或已删除的路由会使检查失败。', '',
    '| 路由声明 | 页面组件 | 客户动作或范围 |', '| --- | --- | --- |');
  for (const [name, route] of routes) {
    const review = coverage.get(name);
    if (!review) issues.push('路由未分配 ' + name);
    lines.push('| ' + link(route.file, inline(name), route.line) + ' | ' + (route.view ? link(route.view) : '默认重定向') + ' | ' + (review?.join('；') ?? '待盘点') + ' |');
  }
  for (const name of coverage.keys()) if (!routes.has(name)) issues.push('清单引用的路由已移除 ' + name);

  function section(title, description) {
    lines.push('', '## ' + title, '', description, '');
  }
  function group(file, items, label = path.basename(file)) {
    lines.push('<details><summary>' + label + '（' + items.length + '）</summary>', '', link(file, '源码'), '');
    for (const item of items) lines.push('- ' + inline(item));
    lines.push('', '</details>', '');
  }
  section('菜单、弹窗与前端调用', '菜单读取静态 path 与 showPath，Vue 文件按模块列出，API 按具名导出函数列出；直接调用 axiosRequest 的函数同时标出方法和路径。按钮可见性仍需用目标版本和账号核实。');
  for (const file of listFiles('devFront/src/stores', (name) => /MenuStore\.js$|mainLeftMenusStore\.js$/.test(name))) {
    group(file, menuItems(file));
  }
  const views = 'devFront/src/views/Main';
  for (const entry of fs.readdirSync(path.join(root, views), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isDirectory()) continue;
    const dir = views + '/' + entry.name;
    group(dir, listFiles(dir, (name) => name.endsWith('.vue'), true).map((file) => file.slice(dir.length + 1)), entry.name + ' 页面及弹窗');
  }
  for (const file of listFiles('devFront/src/api/allRequest', (name) => name.endsWith('.js'))) group(file, apiExports(file));

  section('五类工程的服务端接口', '按服务、登记文件、HTTP 方法和路径列出。此处用于定位产品能力；HTTP 方法不足以判断业务有无副作用，助手只开放自身明确允许的读取操作。');
  for (const service of ['kingioserver', 'kingdbmanager', 'kingalarm', 'kingcalculation', 'kingclient']) {
    const dir = center + '/' + service + '/exe/lib/routers/api/v1';
    for (const file of listFiles(dir, (name) => name.endsWith('_router_config.js'))) {
      group(file, configuredEndpoints(file), service + ' / ' + path.basename(file));
    }
  }
  const io = center + '/kingioserver/exe/Routes/RestfulManage.js';
  group(io, collectionEndpoints(io), '数采设备、变量与通信接口');

  section('原生编辑器、脚本与运行端', '以下是选定的功能目录和运行入口。原生二维控件、动态绑定与脚本配置项按实现文件定位；三维只登记 KF 编辑入口，依赖库及美术资源不计作助手能力。');
  const sourceDirs = [
    [native + '/Common/Graphic', '二维图元、控件及动态绑定', true],
    [native + '/DevelopClient/libs/editor', '原生编辑器与脚本配置', true],
    [native + '/HT3DEditor/client', '原生三维入口', false],
    [nodeRuntime + '/kingcalculation/exe/lib/service/globalScriptMng', '计算脚本宿主及保护逻辑', true],
    [nodeRuntime + '/kingalarm/exe/lib/services/alarm', '运行报警规则、状态及事件', true],
    [nodeRuntime + '/kingdbconnector/exe/lib/services/datasource/datasource_access', '运行数据源适配器源码', false],
    [nodeRuntime + '/kingclient/exe/lib/services/reportDataMng', '运行报表数据消费', true],
    [nodeRuntime + '/kingclient/exe/public/javascripts/RunClient/Frame/libs/runview', '客户端运行画面与取数', false],
    ['front/src/views/Main/RunningNodesManagerView', '运维节点与 App 界面', true],
    ['kf-reference/KingFusion3.6_Node/kingopsproxy/exe/kingopsagent/exe/lib/services/deploy', '节点部署处理', true],
  ];
  for (const [dir, label, recursive] of sourceDirs) {
    const files = listFiles(dir, (name) => /\.(js|html|vue)$/.test(name), recursive);
    if (!files.length) throw new Error('原生或运行入口清单为空 ' + dir);
    group(dir, files.map((file) => file.slice(dir.length + 1)), label);
  }

  section('助手实际入口与版本复核', '登记表来自当前助手。配置读取、模型工具和浮窗实时监视的入口分别审阅。下列短指纹用于提醒维护者复核同名实现的内容变更。');
  for (const [file, name] of [['query-tools.ts', 'queryTools'], ['skills.ts', 'skills'], ['next-step.ts', 'steps'], ['next-step.ts', 'questions']]) {
    group('dev/agent/src/' + file, objectKeys('dev/agent/src/' + file, name), name);
  }
  const tracked = [
    ...listFiles('dev/agent/src', (name) => name.endsWith('.ts')),
    // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    ...listFiles('dev/agent/runtime-observer', (name) => name.endsWith('.js')),
    // end
    ...listFiles('devFront/src/assistant', (name) => /\.(js|vue)$/.test(name)),
    ...listFiles('dev/agent/examples', (name) => name.endsWith('.txt')),
    ...listFiles('dev/agent/test', (name) => name.endsWith('.test.ts')),
  ];
  lines.push('| 助手代码、模板及测试 | SHA-256 前 16 位 |', '| --- | --- |');
  for (const file of tracked) {
    const hash = createHash('sha256').update(read(file).replaceAll('\r\n', '\n')).digest('hex').slice(0, 16);
    lines.push('| ' + link(file, file) + ' | ' + inline(hash) + ' |');
  }
  lines.push('', '检查范围包括静态路由、菜单键、Vue 文件名、具名请求封装、所列服务的接口登记、原生功能目录内文件名及助手代码内容。现有产品文件内同名属性的语义、动态拼接的 API、插件现场安装状态、协议驱动的外部点表和未接入服务的内部变化仍需单独审阅。源码快照不能证明现场正在运行的版本。', '<!-- end -->', '');
  return { contents: lines.join('\n'), issues, count: actions.length, routeCount: routes.size };
}

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--check', '--write'].includes(mode)) {
  console.error('用法 node scripts/audit-kf-assistant-capabilities.mjs --check 或 --write');
  process.exitCode = 2;
} else {
  const { contents, issues, count, routeCount } = generate();
  if (mode === '--write') fs.writeFileSync(path.join(root, index), contents);
  else if (!fs.existsSync(path.join(root, index)) || read(index) !== contents) issues.push('源码索引与当前输入不同，请运行 --write 并审阅差异。');
  if (issues.length) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  } else console.log('已核对 ' + count + ' 组客户动作、' + routeCount + ' 个路由键。' + (mode === '--write' ? '索引已生成。' : '索引一致。'));
}
// end
