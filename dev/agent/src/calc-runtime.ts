// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { HttpError } from './shared.ts';
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
import { sourceFunctionContracts, type SourceFunctionContract } from './calc-function-knowledge.ts';
// end

// Public registrations in the Node calculation runtime's lib/init/globalFunc.js.
// Reading this catalog never loads an adapter or executes a customer's script.
export const globalFamilies = {
  dll: ['ExecuteDllFunction', 'LoadDllFile', 'UnloadDllFile'],
  file: ['AsynIsFileExists', 'AsynReadFile', 'AsynWriteFile', 'ReadFile', 'WriteFile', 'isFileExists'],
  kh: [
    'AsynKHAddDatas',
    'AsynKHQueryRawDatas',
    'AsynKHQuerySampleDatas1',
    'AsynKHQuerySampleDatas2',
    'KHAddDatas',
    'KHGetCurrentValue',
    'KHQueryRawDatas',
    'KHQuerySampleDatas1',
    'KHQuerySampleDatas2',
  ],
  kio: ['AsynKIOQueryDatas', 'AsynKIOUpdateDatas', 'KIOQueryDatas', 'KIOUpdateDatas'],
  ks: [
    'AsynKSQueryDatas',
    'AsynKSQueryHistoryDatas',
    'AsynKSUpdateDatas',
    'KSQueryDatas',
    'KSQueryHistoryDatas',
    'KSUpdateDatas',
  ],
  math: [
    'Abs',
    'ArcCos',
    'ArcSin',
    'ArcTan',
    'Average',
    'Cos',
    'Exp',
    'LogE',
    'LogN',
    'PI',
    'Pow',
    'Round',
    'Sgn',
    'Sin',
    'Sqrt',
    'Sum',
    'Tan',
    'Trunc',
  ],
  md5: ['hex_md5', 'md5'],
  mongo: [
    'AsynMongoDBDeleteMany',
    'AsynMongoDBInsertMany',
    'AsynMongoDBQuery',
    'AsynMongoDBUpdateMany',
    'MongoDBDeleteMany',
    'MongoDBInsertMany',
    'MongoDBQuery',
    'MongoDBUpdateMany',
  ],
  redis: ['redisDel', 'redisExists', 'redisGet', 'redisHdel', 'redisHget', 'redisHset', 'redisSet'],
  redundancy: ['SubscribeRedundancyMessage', 'UnsubscribeRedundancyMessage'],
  request: ['getTokenbyUser', 'sendHttpRequestwithToken', 'sendHttpRequestwithUser'],
  sql: ['AsynSQLExecute', 'AsynSQLQuery', 'SQLExecute', 'SQLQuery'],
  user: ['batchCreateUser', 'batchDeleteUser', 'batchModifyUser', 'batchQueryUser', 'batchResetPassword'],
} as const;
type Contract = {
  family: string;
  signature: string;
  usage: string;
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  detail?: string;
  // end
  source: string;
  requestOnly?: boolean;
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
} & Partial<Pick<SourceFunctionContract, 'result' | 'effect' | 'verification'>>;

function contractSummary(contract: Contract) {
  return {
    signature: contract.signature,
    usage: contract.usage,
    source: contract.source,
    ...(contract.verification && {
      result: contract.result,
      effect: contract.effect,
      verification: { status: 'source-only' as const, ...contract.verification },
    }),
  };
}
// end
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
export const systemLifecycleNotice =
  '仓库含两种系统宿主实现。Node 快照在启动时误调关闭正文；工程模板保存关闭回调供退出时调用。两者均未等待异步收尾。目标 App 的实际停止路径须用跨重启的回执核对；未取证前，不能保证何时执行关闭正文或完成关键写入。';

const contracts: Record<string, Contract> = {
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  ...sourceFunctionContracts,
  // end
  WriteFile: {
    family:'file', signature:'await WriteFile(mode, path, data[, encoding])',
    usage:'1 覆盖，2 追加。路径为字符串，正文可用字符串，encoding 可选。包装返回 Promise，内部同步写文件，成功码 0。使用本应用专用且已确认可写的路径。',
    detail:'核对返回码，再回读持久化内容。', source:'service/globalFuncMng/file_global_func.js',
  },
  ReadFile: {
    family:'file', signature:'await ReadFile(path[, encoding], output)',
    usage:'传入接收对象，返回码 0 时从 output.data 取内容；文本可显式指定 utf8。底层同步读取。',
    detail:'检查返回码后再解释内容。', source:'service/globalFuncMng/file_global_func.js',
  },
// end
  KIOQueryDatas: {
    family: 'kio',
    signature: 'await KIOQueryDatas(alias, tagNames, rows)',
    // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
    usage: '第三参传新数组。返回码 0 表示读接口成功，每个必需点仍须按 N 找到唯一记录，V 为值、Q 为质量、T 为源时间。KF 数采数值质量 192 为良好，0 为坏，缺点、缺质量和空值不可作正常采样。业务要求坏质量停写时，在所有写操作前检查全部必需样本；下一周期重新读取，质量恢复后用新值计算。',
    // end
    detail:
      'const rows = [];\nconst code = await KIOQueryDatas(alias, [tagName], rows);\nconst sample = code === 0 ? rows.find(row => row.N === tagName) : undefined;',
    source: 'service/globalFuncMng/globalInterfaceMng/kio_global_interface.js',
  },
  AsynKIOQueryDatas: {
    family: 'kio',
    signature: 'AsynKIOQueryDatas(alias, tagNames, callback)',
    usage: '结果通过 callback(code, rows) 交付。外层包装不会返回采样数组，错误码也要在回调里处理。',
    detail: 'AsynKIOQueryDatas(alias, [tagName], (code, rows) => { /* 在此核对返回码与点名 */ });',
    source: 'service/globalFuncMng/globalInterfaceMng/kio_global_interface.js',
  },
  KIOUpdateDatas: {
    family: 'kio',
    signature: 'await KIOUpdateDatas(alias, changes, errorCodes)',
    // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
    usage: 'alias 为工程连接名，changes 为非空数组，元素 N 为点名、V 为值（不可为空串或 undefined），可省略 T 和 Q，默认本机时间和 Good。第三参必须为数组，HTTP 写路径清空它且不填逐点结果。await 返回总码，0 为接口成功，-2 为参数错误，其余非零为失败。捕获异常，超时先回读目标点再决定是否重试。',
    // end
    detail:
      'const errors = [];\nconst code = await KIOUpdateDatas(alias, [{ N: outputTag, V: value, Q: 192 }], errors);',
    source: 'service/globalFuncMng/globalInterfaceMng/kio_global_interface.js',
  },
  // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
  AsynKIOUpdateDatas: {
    family: 'kio', signature: 'AsynKIOUpdateDatas(alias, changes, callback)',
    usage: '第三参为回调，在 callback(code, errors) 中处理结果；HTTP 写路径 errors 为空。0 为总接口成功，输入错误可返回 -2，其余非零记录失败。写后用目标点回读确认。',
    detail: 'AsynKIOUpdateDatas(alias, [{N: outputTag, V: value}], (code, errors) => { /* 处理总回执 */ });',
    source: 'service/interface/kio_interface.js',
  },
  SQLExecute: {
    family: 'sql', signature: 'await SQLExecute(alias, sql, timeoutMs = 3000)',
    usage: '工程连接名和 SQL 为字符串，第三参是可省略的数值超时毫秒。await 返回数值状态码，0 表示接口成功，-2 表示参数或连接配置无效，也可能收到适配器非零错误码。无影响行数或结果数组。捕获抛错；超时后按业务键查询确认，再决定是否重试，避免重复写入。',
    detail: 'const code = await SQLExecute(alias, statement, 3000);',
    source: 'service/interface/sql_interface.js',
  },
  AsynSQLExecute: {
    family: 'sql', signature: 'AsynSQLExecute(alias, sql, callback, timeoutMs = 3000)',
    usage: '第三参为 callback(code)，第四参是超时毫秒。包装层无写结果返回值。成功 0，非零为错误；回调未收到或超时时，先按业务键核对记录。',
    detail: 'AsynSQLExecute(alias, statement, code => { /* 核对执行状态 */ }, 3000);',
    source: 'service/interface/sql_interface.js',
  },
  // end
  KHQueryRawDatas: {
    family: 'kh',
    signature: 'await KHQueryRawDatas(alias, tagNames, start, end, version, filter, quality, rows)',
    usage:
      '查询历史原始记录。起止时间用字符串，版本接受 -3、-2、-1 或 0，filter 为字符串，quality 为数值 0 或 1。用新数组接收记录，按业务确认时间范围和参数含义。',
    detail:
      'const rows = [];\nconst code = await KHQueryRawDatas(alias, [tagName], start, end, version, filter, quality, rows);',
    source: 'service/globalFuncMng/globalInterfaceMng/kh_global_interface.js',
  },
  KSQueryDatas: {
    family: 'ks',
    signature: 'await KSQueryDatas(alias, tagNames, rows)',
    usage: '从已配置的 KS 连接查询点集合。传入点名数组和新的结果数组，等待调用完成并核对返回码。',
    detail: 'const rows = [];\nconst code = await KSQueryDatas(alias, [tagName], rows);',
    source: 'service/globalFuncMng/globalInterfaceMng/ks_global_interface.js',
  },
  SQLQuery: {
    family: 'sql',
    signature: 'await SQLQuery(alias, sql, rows, timeoutMs)',
    usage:
      '查询关系库。超时参数可省略，包装函数默认 3000 毫秒。第三个参数每次传入新数组，成功时运行接口按下标写入结果行。',
    detail: 'const rows = [];\nconst code = await SQLQuery(alias, "SELECT 1 AS sample", rows, 3000);',
    source: 'service/interface/sql_interface.js',
  },
  MongoDBQuery: {
    family: 'mongo',
    signature: 'await MongoDBQuery(alias, collection, filter, rows)',
    usage: '指定工程内连接名、集合名、条件对象和输出数组。条件类型按运行接口核对，使用已确认的查询条件。',
    detail: 'const rows = [];\nconst code = await MongoDBQuery(alias, collection, filterObject, rows);',
    source: 'service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js',
  },
  redisGet: {
    family: 'redis',
    signature: 'await redisGet(alias, key)',
    usage:
      '连接名和键均为字符串。查询成功返回数据源响应的 data，连接或查询失败可以返回错误码。核对适配器和期望值类型。',
    detail: 'const result = await redisGet(alias, key);',
    source: 'service/interface/redis_interface.js',
  },
  Average: {
    family: 'math',
    signature: 'Average(numbers)',
    usage: '对数组元素累加后除以数组长度。传入前检查非空、数值、质量及缺样策略；空数组会得到 NaN。',
    detail: 'const mean = values.length && values.every(Number.isFinite) ? Average(values) : null;',
    source: 'service/globalFuncMng/math_global_func.js',
  },
  Sum: {
    family: 'math',
    signature: 'Sum(numbers)',
    usage: '从 0 开始依次累加数组元素。空数组返回 0，字符串参与加法时可能拼接。',
    detail: 'const result = Sum([2, 4, 6]);',
    source: 'service/globalFuncMng/math_global_func.js',
  },
  global: {
    family: 'dictionary',
    signature: 'global[variableName]',
    usage:
      '计算 App 初始化时按工程数据词典的名称设置全局初值，IO 变量按工程内数据源分组。先核对词典类型与映射。初值和当前运行采样分别取证。',
    detail: 'const current = global[variableName];',
    source: 'service/globalVarMng/dataDictionary/globalVar.js',
  },
  system: {
    family: 'host',
    signature: '系统脚本（应用程序启动时／关闭时）',
    usage:
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
      '在一个 system 草稿中提交 code（启动）和 shutdown（关闭）两段完整无参 JS 函数体。词典、KC 已登记，已等待数据源初始化，自定义函数先加载；HTTP 服务稍后开始监听。可查 math、file、kio、sql 等登记与适配器签名，有连接并不保证点值已就绪。重启重新走初始化。' + systemLifecycleNotice,
// end
    detail: '在系统脚本列表选择所需事件，双击打开对应正文。',
    source: 'service/globalScriptMng/systemScript/systemScript.js',
  },
  dataChange: {
    family: 'host',
    signature: '数据变化脚本正文（InParam）',
    usage:
      // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
      '精确词典数据项使用环境中带 trigger 的变量引用作为 triggerRef，保存时填写对应变量名、生效选是。mapped 的 pointRef 指向该变量已配置的可读 KIO 点，memory 由工程脚本赋值。用 global[匿名变量引用字符串] 读取当前值。InParam 是字符串 "Global"。运行态严格比较新旧 JS 值，订阅收到字面 Bad 时跳过词典赋值；恢复同值通常无变化，恢复新值才产生变化，首次同步也可能触发。需要质量或源时间时通过关联点单独查询。点表达式和通配配置走其他路径，当前生成只支持精确词典数据项。',
      // end
    detail: '用相同值与新值触发，记录实际进入次数、触发来源及读取的变量。',
    source: 'init/globalScript.js',
  },
  condition: {
    family: 'host',
    signature: '条件事件的进入、存在、离开三个处理函数',
    usage:
      // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
      '条件事件仅在表达式严格为 true 或 false 时切换。使用 global[匿名词典变量引用] 与阈值或布尔值明确比较，支持纯比较、算术、&&、||、!。约每50ms扫描，首次为真进入一次，下次扫描仍真则启动定时器，满间隔才执行存在时；转假后清除定时器并离开一次，再次为真可重入。三段都无宿主参数，异步回调可能重叠。直接数据源点断连的离开分支仅适用于识别出的直接引用，映射词典可能保留旧值。提交单个 host=condition 草稿，code=进入时正文，condition={expression,interval,unit,exist,out}，exist/out 分别为存在时、离开时完整正文。单位 s、min、hour；编辑器可选 ms 但此运行态按秒处理。',
      // end
    detail: '用 false → true → 持续 true → false 的输入序列分别验三个处理函数。',
    source: 'service/globalScriptMng/conditionEventScript/condition_script.js',
  },
  customFunction: {
    family: 'host',
    signature: 'global[functionName](...args)',
    usage:
      // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
      '编辑器分别保存名称、functionName、有序 paramlist 和函数正文。Center 将正文包装成 async function，节点把已启用模块注册到 global[functionName]。复用已启用的 @function 引用，依据 signature.arity、contract 和业务约定匹配；positions 从 1 起，返回约定未知时向开发人员核对。新增时提交 host=customFunction、definition={functionName,parameters}、code 仅写函数体，用形参取值并 return。其他草稿用 await global["@function:new"](...实参) 调用同批新函数。周期脚本等结果后写回；请求式脚本填 OutParam 并 endResponse(RequestID)。',
      // end
    detail: 'const result = await global[confirmedFunctionName](...args);',
    source: 'service/globalScriptMng/customFunction/customFunction.js',
  },
  period: {
    family: 'host',
    signature: '周期性脚本正文',
    usage:
      '调度器调用已加载的周期函数。编辑器中填写函数正文，固定间隔与日历触发在脚本属性配置。异步查询应等待结果；外部写回要用目标测试实例复核。',
    detail: 'const rows = [];\nconst code = await KIOQueryDatas(alias, [tagName], rows);',
    source: 'service/globalScriptMng/periodicScript/periodScript.js',
  },
  endResponse: {
    family: 'host',
    signature: 'endResponse(RequestID)',
    usage:
      '请求式宿主按顺序传入 InParam、OutParam、RequestID 和 Token。完成异步处理后填写 OutParam，并用本次 RequestID 结束回包；每条业务分支应能完成响应。',
    detail: 'OutParam.result = InParam.value;\nendResponse(RequestID);',
    source: 'service/globalScriptMng/onDemandCalcScript/onDemandCalcScript.js',
    requestOnly: true,
  },
};
export const runtimeFamilyNames = [...Object.keys(globalFamilies), 'dictionary', 'host'];
export type RuntimeQuery = { family?: string; symbol?: string };
export const runtimeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    family: { type: 'string', enum: runtimeFamilyNames, description: '按函数族查登记的符号及详细用法覆盖。' },
    symbol: {
      type: 'string',
      maxLength: 100,
      description:
        '准确函数名，如 SQLQuery、Average、endResponse。global 查数据词典的全局变量，period 查周期宿主。',
    },
  },
};
export function readRuntimeQuery(raw: unknown): RuntimeQuery {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, '运行接口查询参数无效');
  const query: RuntimeQuery = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'family' && typeof value === 'string' && runtimeFamilyNames.includes(value))
      query.family = value;
    else if (
      key === 'symbol' &&
      typeof value === 'string' &&
      value.length <= 100 &&
      /^(?:global\.)?[a-zA-Z_$][\w$]*$/.test(value)
    )
      query.symbol = value.replace(/^global\./, '');
    else throw new HttpError(400, '请指定计算运行接口类别或准确函数名');
  }
  return query;
}
export function runtimeReference(kind: string, query: RuntimeQuery) {
  if (!['period', 'request', 'calculation'].includes(kind))
    throw new HttpError(400, '请从计算工程查询它的运行接口');
  const layer = 'KF 3.6 计算运行态源码';
  const families = Object.entries(globalFamilies);
  const contract =
    query.symbol && Object.hasOwn(contracts, query.symbol) ? contracts[query.symbol] : undefined;
  const family =
    contract?.family ??
    families.find(([, names]) => (names as readonly string[]).includes(query.symbol ?? ''))?.[0];
  if (query.symbol) {
    if (!family || (query.family && family !== query.family))
      return {
        layer,
        state: 'unknown',
        lines: ['本版计算接口索引未匹配到该符号。工程自定义函数和词典变量请在当前工程分别查证。'],
      };
    if (!contract)
      return {
        layer,
        state: 'registration',
        family,
        lines: [query.symbol + ' 已在 ' + family + ' 函数族登记。参数、返回和调用样例仍待核对。'],
        source: 'service/globalFuncMng/' + family + '_global_func.js',
      };
    if ((contract.requestOnly && kind === 'period') || (query.symbol === 'period' && kind === 'request'))
      return {
        layer,
        state: 'differentHost',
        family,
        lines: ['当前选中的脚本宿主与该用法不符。请在对应的周期性或请求式脚本中核对。'],
      };
    return {
      layer,
      state: 'contract',
      family,
      // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
      ...contractSummary(contract),
      example: contract.detail,
      lines: [
        layer + ' · ' + contract.source,
        contract.signature,
        contract.usage,
        ...(contract.verification ? [
          '结果交付 · ' + contract.result,
          '操作影响 · ' + contract.effect,
          '验证状态 · 已核对源码，目标环境行为待验证。' + contract.verification.method + ' · ' + contract.verification.check,
        ] : [contract.detail!, '示例中的工程参数需按当前方案填写，目标实例的实际结果另行核对。']),
      ],
      // end
    };
  }
  const available = Object.entries(contracts)
    .filter(([, item]) => !query.family || item.family === query.family)
    .map(([name]) => name);
  const registered = query.family ? families.find(([name]) => name === query.family)?.[1] : undefined;
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  const cards = query.family ? available.map(symbol => ({symbol, ...contractSummary(contracts[symbol])})) : undefined;
  // end
  return {
    layer,
    state: 'index',
    families: query.family ? [query.family] : runtimeFamilyNames,
    documented: available,
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    cards,
    // end
    registered,
    lines: [
      query.family ? '函数族 ' + query.family : '可查函数族 ' + runtimeFamilyNames.join('、'),
      ...(registered ? ['运行态登记 ' + registered.join('、')] : []),
      // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
      '已核对用法 ' + (available.join('、') || '待补充'),
      ...(cards?.map(card => [card.signature, card.result, card.verification && '已核对源码，运行待验证']
        .filter(Boolean).join(' · ')) ?? []),
      // end
    ],
  };
}
// end
