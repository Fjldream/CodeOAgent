// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
// Source-reviewed projections of the offline audit. These records do not imply live verification.
export type SourceFunctionContract = {
  family: string;
  signature: string;
  usage: string;
  result: string;
  effect: string;
  source: string;
  verification: { method: string; check: string };
  minimumArgs?: number;
  callback?: number | "last";
  outputArray?: number;
};

export const sourceFunctionContracts: Record<string, SourceFunctionContract> = {
  KHQuerySampleDatas1: {
    family: "kh",
    signature:
      "KHQuerySampleDatas1(alias, tagNames, specificTime, samplingMode, rows[, timeoutMs])",
    usage:
      '指定时刻必须为字符串。模式校验用宽松比较匹配 0 或 1。传统 KH 把模式与时刻交给原生 DAO，KH4.0 Linux 时刻查询分支未使用该模式值，且用 value || "-" 取数据，可能把真实 0 输出为 "-"。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。',
    result:
      "Promise<状态码>。进入 HTTP 层后清空 rows，再写入适配器行。Linux 分组形态会展开。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "用已知原始记录覆盖精确命中、前后都有数据、跨日、无记录、0 值及坏质量。对照返回字段、源时间、时区和 mode=0/1 的实际效果。",
    },
    minimumArgs: 5,
    outputArray: 5,
  },
  KHQuerySampleDatas2: {
    family: "kh",
    signature:
      "KHQuerySampleDatas2(alias, tagNames, startTime, endTime, samplingMode, interval, calculationMode, rows[, timeoutMs])",
    usage:
      "起止均为字符串。内层接受模式 0/1/2，并拒绝 interval <= 0。公共入口中第七位是 calculationMode，第八位才是输出容器或回调。内层七参分支的移位在该包装路径不会触发。 传统 KH 枚举将 0/1/2 标作步进、线性、统计。KH4.0 Linux 的实现将 1/2 用于步进和趋势，趋势用毫秒时间差除以 interval 算网格。其统计分支与传统枚举也有差异，勿跨适配器沿用模式或单位。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。",
    result:
      "Promise<状态码>。进入 HTTP 层后清空并填充 rows。该路径还识别回包 errcode。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "给定固定短区间、两点名和已知记录，按适配器查模式 0/1/2、间隔单位、首末边界、质量与空窗。七参及对照八参从脚本公开入口单独取证。",
    },
    minimumArgs: 8,
    outputArray: 8,
  },
  KHGetCurrentValue: {
    family: "kh",
    signature: "KHGetCurrentValue(alias, tagNames, rows[, timeoutMs])",
    usage:
      "KH4.0 Linux 分支返回 N/T/V/Q 等字段，Q 为 Good/Bad。该调用走 KH 当前值，结果新鲜度需按该适配器实测。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。",
    result:
      "Promise<状态码>。HTTP 层先清空 rows，再按下标复制历史适配器的当前值，解析异常可给 -1。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "与 KIO 读数并列验证停采前后、真实 0、坏质量、不存在点、时间戳和无新样本。",
    },
    minimumArgs: 3,
    outputArray: 3,
  },
  KHAddDatas: {
    family: "kh",
    signature: "KHAddDatas(alias, dataByTag, errorCodes[, timeoutMs])",
    usage:
      "dataByTag 是按点名组织的对象。每个点的值是非空记录数组，同组 DataValue 类型一致。每条必有 DataValue、非空字符串 TimeStamp 和 QualityStamp。可选 DataType 为数字，DataLength 仅在 DataType 为 10/11/13/14 时接受数字。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。",
    result:
      "Promise<总状态码>。进入 HTTP 层后清空 errorCodes。不同回包分支写入 ErrorStatus 或按 tag_oks 追加 0。",
    effect: "写历史",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "人工确认点归属、版本和重复时间戳策略。用专用历史点验单点、多点和部分失败，再按点名和时间回读，核实总码与逐项状态。",
    },
    minimumArgs: 3,
    outputArray: 3,
  },
  AsynKHAddDatas: {
    family: "kh",
    signature: "AsynKHAddDatas(alias, dataByTag, callback[, timeoutMs])",
    usage:
      "dataByTag 是按点名组织的对象。每个点的值是非空记录数组，同组 DataValue 类型一致。每条必有 DataValue、非空字符串 TimeStamp 和 QualityStamp。可选 DataType 为数字，DataLength 仅在 DataType 为 10/11/13/14 时接受数字。 空回执不能证明点位均写入成功。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。",
    result: "callback(code, errorCodes)。Linux 标记分支可以回空 errorCodes。",
    effect: "写历史",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "人工确认点归属、版本和重复时间戳策略。用专用历史点验单点、多点和部分失败，再按点名和时间回读，核实总码与逐项状态。 另核对回调次数及 Linux 空错误数组。",
    },
    minimumArgs: 3,
    callback: 3,
  },
  AsynKHQueryRawDatas: {
    family: "kh",
    signature:
      "AsynKHQueryRawDatas(alias, tagNames, startTime, endTime, version, filter, quality, callback[, timeoutMs])",
    usage:
      "起止为字符串，version 为 -3/-2/-1/0，filter 为字符串，quality 为数字 0/1。与已有 KHQueryRawDatas 契约配对。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。",
    result:
      "callback(code, rows)。HTTP 层收集适配器返回行，失败分支可能交付空数组。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "用同一批原始记录比对 await 版本与回调版本。验过滤、质量、空结果、断连回调及非标准错误回包。",
    },
    minimumArgs: 8,
    callback: 8,
  },
  AsynKHQuerySampleDatas1: {
    family: "kh",
    signature:
      "AsynKHQuerySampleDatas1(alias, tagNames, specificTime, samplingMode, callback[, timeoutMs])",
    usage:
      '指定时刻必须为字符串。模式校验用宽松比较匹配 0 或 1。传统 KH 把模式与时刻交给原生 DAO，KH4.0 Linux 时刻查询分支未使用该模式值，且用 value || "-" 取数据，可能把真实 0 输出为 "-"。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。',
    result: "callback(code, rows)。回调的数据数组由运行接口创建。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "用已知原始记录覆盖精确命中、前后都有数据、跨日、无记录、0 值及坏质量。对照返回字段、源时间、时区和 mode=0/1 的实际效果。 对照 await 版并核对回调时序。",
    },
    minimumArgs: 5,
    callback: 5,
  },
  AsynKHQuerySampleDatas2: {
    family: "kh",
    signature:
      "AsynKHQuerySampleDatas2(alias, tagNames, startTime, endTime, samplingMode, interval, calculationMode, callback[, timeoutMs])",
    usage:
      "内层接受模式 0/1/2，并拒绝 interval <= 0。公共入口中第七位是 calculationMode，第八位才是输出容器或回调。内层七参分支的移位在该包装路径不会触发。 传统 KH 枚举将 0/1/2 标作步进、线性、统计。KH4.0 Linux 的实现将 1/2 用于步进和趋势，趋势用毫秒时间差除以 interval 算网格。其统计分支与传统枚举也有差异，勿跨适配器沿用模式或单位。 七参调用可能在试图调用缺失回调时使外层 Promise 拒绝。 使用已保存的 KH 连接名。HTTP 层默认超时 3000ms。",
    result: "callback(code, rows)。第八参必须为回调函数。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/kh_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "给定固定短区间、两点名和已知记录，按适配器查模式 0/1/2、间隔单位、首末边界、质量与空窗。七参及对照八参从脚本公开入口单独取证。 另核对短签名拒绝方式及异步错误回执。",
    },
    minimumArgs: 8,
    callback: 8,
  },
  Abs: {
    family: "math",
    signature: "Abs(value)",
    usage: "直接委托 mathjs.abs。",
    result: "对应 mathjs.abs 的绝对值结果。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "负数、-0、无效输入及数值类型。",
    },
  },
  Trunc: {
    family: "math",
    signature: "Trunc(value)",
    usage: "直接委托 JavaScript Math.trunc。",
    result: "Math.trunc 的结果，有限小数向零截断。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "目标 Node 单测",
      check: "正负小数、负零、NaN 和字符串转换。",
    },
  },
  Round: {
    family: "math",
    signature: "Round(value[, decimals])",
    usage: "直接委托 mathjs.round，精度参数的默认值和扩展类型由依赖解释。",
    result: "对应 mathjs.round 的舍入结果。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "正负半值、两位小数和无效精度。",
    },
  },
  Pow: {
    family: "math",
    signature: "Pow(base, exponent)",
    usage: "直接委托 mathjs.pow。",
    result: "对应 mathjs.pow 的幂运算结果。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "负底数、分数指数、0 和非有限数。",
    },
  },
  Sqrt: {
    family: "math",
    signature: "Sqrt(value)",
    usage: "直接委托 mathjs.sqrt。",
    result: "对应 mathjs.sqrt 的平方根结果。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "0、正数与负数。核对负数是否得到复数及其在 KF 脚本中的序列化。",
    },
  },
  ArcCos: {
    family: "math",
    signature: "ArcCos(value)",
    usage:
      "先检查 value 是否超出 [-1, 1]，超出返回 this.NaN。域内通过 math.acos 计算。",
    result: "常规数值返回角度，按源码换算并四舍五入到最多两位小数。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "±1、0、越界以及调用时 this 对无效值的影响。",
    },
  },
  ArcSin: {
    family: "math",
    signature: "ArcSin(value)",
    usage:
      "先检查 value 是否超出 [-1, 1]，超出返回 this.NaN。域内通过 math.asin 计算。",
    result: "常规数值返回角度，最多两位小数。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "±1、0、越界及非数值。",
    },
  },
  ArcTan: {
    family: "math",
    signature: "ArcTan(value)",
    usage: "实现也限制 [-1, 1]，超出返回 this.NaN。",
    result: "常规数值返回角度，最多两位小数。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "对照 1 与 2、负数及非数值，确认脚本调用的限制。",
    },
  },
  Cos: {
    family: "math",
    signature: "Cos(degrees)",
    usage: "先将角度换算为弧度，再使用 math.cos 和 Round。",
    result: "常规数值返回余弦值，最多两位小数。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "0、90、180 度和负角度。",
    },
  },
  Sin: {
    family: "math",
    signature: "Sin(degrees)",
    usage: "先将角度换算为弧度，再使用 math.sin 和 Round。",
    result: "常规数值返回正弦值，最多两位小数。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "0、30、90 度和负角度。",
    },
  },
  Tan: {
    family: "math",
    signature: "Tan(degrees)",
    usage: "先将角度换算为弧度，再使用 math.tan 和 Round。包装没有奇点处理。",
    result: "常规数值返回正切值，最多两位小数。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "45 度和 90 度两侧及 90 度，明确调用方的奇点策略。",
    },
  },
  Exp: {
    family: "math",
    signature: "Exp(exponent)",
    usage: "使用 Pow(math.e, exponent)。",
    result: "e 的指定次幂。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "指数 0、正负指数与指数溢出。",
    },
  },
  LogE: {
    family: "math",
    signature: "LogE(value)",
    usage: "以 math.e 为底调用 mathjs。",
    result: "对应 math.log(value, math.e) 的结果。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "1、正数、0、负数与复数结果。",
    },
  },
  LogN: {
    family: "math",
    signature: "LogN(value, base)",
    usage: "第一参为真数，第二参为底数。",
    result: "对应 math.log(value, base) 的结果。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "常用底数、底为 1、底为 0、负数和无效输入。",
    },
  },
  PI: {
    family: "math",
    signature: "PI()",
    usage: "登记为无参函数。",
    result: "直接返回 math.pi。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "比较 PI() 和 Math.PI 并核对返回类型。",
    },
  },
  Sgn: {
    family: "math",
    signature: "Sgn(value)",
    usage: "先严格比较 0，随后采用 JavaScript 关系比较。",
    result:
      "严格等于数值 0 时返回 0，大于或小于 0 时返回 1 或 -1，未命中返回 undefined。",
    effect: "纯计算",
    source: "service/globalFuncMng/math_global_func.js",
    verification: {
      method: "目标 Node 单测",
      check: '数值 0、±值、NaN、null 和字符串 "0"。',
    },
  },
  hex_md5: {
    family: "md5",
    signature: "hex_md5(input)",
    usage: "包装只向依赖传入第一个参数。",
    result: "直接返回 md5(input) 的结果。",
    effect: "摘要",
    source: "service/globalFuncMng/md5_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check: "用空串、ASCII 和中文向量核对实际编码及十六进制格式。",
    },
  },
  md5: {
    family: "md5",
    signature: "md5(input)",
    usage: "全局名直接指向依赖导出。库版本和可选参数由目标机的依赖决定。",
    result: "直接返回 md5 依赖的结果。",
    effect: "摘要",
    source: "service/globalFuncMng/md5_global_func.js",
    verification: {
      method: "对应依赖版本单测",
      check:
        "与 hex_md5 对照相同输入，核对 Buffer 和扩展选项是否受当前依赖支持。",
    },
  },
  KSQueryHistoryDatas: {
    family: "ks",
    signature:
      "KSQueryHistoryDatas(alias, tagNames, startTime, endTime, version, filter, quality, rows)",
    usage:
      "输入为连接名、非空点名数组和历史查询参数。转发字段为 startTime、endTime、DataVersion、filter、dataQuality，计算层没有完整校验这些字段。 每次传新数组，避免尾部旧行混进结果。",
    result: "Promise<状态码>。HTTP 成功后按索引写 rows，未清空旧数组。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/ks_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "核对目标驱动支持的版本与质量参数、时间单位与日界线、返回行结构和空结果。",
    },
    outputArray: 8,
  },
  AsynKSQueryHistoryDatas: {
    family: "ks",
    signature:
      "AsynKSQueryHistoryDatas(alias, tagNames, startTime, endTime, version, filter, quality, callback)",
    usage:
      "输入为连接名、非空点名数组和历史查询参数。转发字段为 startTime、endTime、DataVersion、filter、dataQuality，计算层没有完整校验这些字段。",
    result: "callback(code, rows)。底层创建新结果数组。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/ks_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "核对目标驱动支持的版本与质量参数、时间单位与日界线、返回行结构和空结果。 另验回调时序和断连。",
    },
    callback: 8,
  },
  AsynKSQueryDatas: {
    family: "ks",
    signature: "AsynKSQueryDatas(alias, tagNames, callback)",
    usage: "第二参须为数组。包装未明确拒绝空点名列表。",
    result: "callback(code, rows)。实时回包的 data 按下标复制。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/ks_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "对照 KSQueryDatas，核对空列表、不存在的点、返回字段、坏质量和超时回调。",
    },
    callback: 3,
  },
  KSUpdateDatas: {
    family: "ks",
    signature: "KSUpdateDatas(alias, changes, errorCodes)",
    usage:
      "changes 通常用含 N/V/T/Q 的非空数组。N 不应有首尾空白，V 不能为 undefined 或空字符串。缺 T 时补本机 locale 时间，缺失或空 Q 时补 Good，这些默认值会修改传入项。 对 Q 使用宽松判断拒绝 true 及等价输入。",
    result:
      "Promise<总状态码>。进入 HTTP 层后清空 errorCodes，已看到的路径未填逐点结果。",
    effect: "写设备",
    source: "service/globalFuncMng/globalInterfaceMng/ks_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "确认用户有权写测试点。用单点、多点和一项失败的批次，核对实际值、质量、源时间和回执数组。",
    },
    outputArray: 3,
  },
  AsynKSUpdateDatas: {
    family: "ks",
    signature: "AsynKSUpdateDatas(alias, changes, callback)",
    usage:
      "changes 通常用含 N/V/T/Q 的非空数组。N 不应有首尾空白，V 不能为 undefined 或空字符串。缺 T 时补本机 locale 时间，缺失或空 Q 时补 Good，这些默认值会修改传入项。 对 Q 使用与 KSUpdateDatas 同类的检查。",
    result:
      "callback(code, errorCodes)。已看到的 HTTP 路径中 errorCodes 为空数组。",
    effect: "写设备",
    source: "service/globalFuncMng/globalInterfaceMng/ks_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "确认用户有权写测试点。用单点、多点和一项失败的批次，核对实际值、质量、源时间和回执数组。 记录回调是否恰好一次。",
    },
    callback: 3,
  },
  AsynSQLQuery: {
    family: "sql",
    signature: "AsynSQLQuery(alias, sql, callback[, timeoutMs = 3000])",
    usage:
      "第二参字符串和 object 都能通过包装校验，实际对象查询的形状取决于适配器。查询正文由运行接口作为 script 下发。",
    result: "callback(code, rows)。外层 async 包装不会返回查询行。",
    effect: "查询",
    source: "service/globalFuncMng/globalInterfaceMng/sql_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "用只读 SELECT 对照 SQLQuery，核对无行、无效 alias、数据库错误与超时。对象形式如业务需要再单独验证。",
    },
    callback: 3,
  },
  isFileExists: {
    family: "file",
    signature: "isFileExists(path)",
    usage: "输入为字符串，下游使用 fs.existsSync，目录路径也可被判定为存在。",
    result:
      "Promise<状态码>。文件系统路径存在返回 0，缺失或异常返回 -1，包装入参不合规返回 -2。",
    effect: "读文件状态",
    source: "service/globalFuncMng/globalInterfaceMng/file_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "在 App 自己的目录下验存在、缺失、相对路径、目录路径和运行用户权限。",
    },
  },
  AsynIsFileExists: {
    family: "file",
    signature: "AsynIsFileExists(path, callback)",
    usage: "下游使用 fs.exists。回调结果类型混合，不能依赖真假值判断。",
    result:
      "即时返回状态码。callback(result) 在存在时收到数值 0，缺失时收到布尔 false，异常可收到 -1。",
    effect: "读文件状态",
    source: "service/globalFuncMng/globalInterfaceMng/file_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "验证 0 与 false 的严格类型差异。核对无效参数和访问受限路径上的回调。",
    },
    callback: 2,
  },
  AsynReadFile: {
    family: "file",
    signature: "AsynReadFile(path[, encoding], callback)",
    usage:
      "支持路径加回调和路径加编码加回调。省略编码时数据来自 fs.readFile 默认输出。部分同步异常只传回调首参。",
    result:
      "即时返回状态码。callback(codeOrError, data) 接收内容。fs 失败可以把 Error 放在首参。",
    effect: "读文件",
    source: "service/globalFuncMng/globalInterfaceMng/file_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "验证省略编码得到 Buffer、显式编码得到文本、缺失文件和权限拒绝，核对即时返回与回调的区别。",
    },
    minimumArgs: 2,
    callback: "last",
  },
  AsynWriteFile: {
    family: "file",
    signature: "AsynWriteFile(mode, path, data[, encoding], callback)",
    usage:
      "mode=1 覆盖，mode=2 追加。第三参经 typeof 校验可为字符串或对象，实际数据类型由 fs 决定。 覆盖分支的 fs.writeFile 回调忽略底层异步错误参数，可能回 0 而没有写成。",
    result:
      "即时返回状态码，业务结果走 callback(codeOrError)。追加分支会转交 fs 错误。",
    effect: "写文件",
    source: "service/globalFuncMng/globalInterfaceMng/file_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "只用测试目录验覆盖与追加。单独制造不可写路径并在回调后回读字节，先确认实际保存再采信用码。",
    },
    minimumArgs: 4,
    callback: "last",
  },
  AsynMongoDBQuery: {
    family: "mongo",
    signature: "AsynMongoDBQuery(alias, collection, filter, callback)",
    usage:
      "filter 按 object 校验，发给 find 的 wherestr。成功分支把嵌套 data 的行复制入新数组。",
    result: "callback(code, rows)。查询外层和嵌套 data 的错误码都能影响 code。",
    effect: "查询",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "KF 实机",
      check:
        "对照 MongoDBQuery，核对无匹配与查错的区别、扩展字段类型以及回调时序。",
    },
    callback: 4,
  },
  MongoDBInsertMany: {
    family: "mongo",
    signature: "MongoDBInsertMany(alias, collection, documents)",
    usage:
      "documents 按 object 类型通过包装并由适配器解释。建议按文档数组核对实际 insertMany 路径。",
    result: "Promise<总状态码>。路径只消费回包的总错误码，成功默认为 0。",
    effect: "新增文档",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "确认测试集合及唯一键。验证批量插入、键冲突和部分成功，插入后按键回读。",
    },
  },
  AsynMongoDBInsertMany: {
    family: "mongo",
    signature: "AsynMongoDBInsertMany(alias, collection, documents, callback)",
    usage:
      "documents 按 object 类型通过包装并由适配器解释。建议按文档数组核对实际 insertMany 路径。",
    result: "callback(code)。路径只消费回包的总错误码，成功默认为 0。",
    effect: "新增文档",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "与 await 版对照，用唯一键回读，并验证重复键、部分失败和回调次数。",
    },
    callback: 4,
  },
  MongoDBUpdateMany: {
    family: "mongo",
    signature: "MongoDBUpdateMany(alias, collection, filter, fields)",
    usage: "filter 下发为 wherestr，fields 在接口层包成 { $set: fields }。",
    result: "Promise<总状态码>。路径只消费回包的总错误码，成功默认为 0。",
    effect: "更新文档",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "人工确认匹配范围，使用只含测试数据的集合核对精确命中、不匹配及批量范围，写后回读实际结果。 检查 fields 的实际覆盖范围。",
    },
  },
  AsynMongoDBUpdateMany: {
    family: "mongo",
    signature:
      "AsynMongoDBUpdateMany(alias, collection, filter, fields, callback)",
    usage: "filter 下发为 wherestr，fields 在接口层包成 { $set: fields }。",
    result: "callback(code)。路径只消费回包的总错误码，成功默认为 0。",
    effect: "更新文档",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "人工确认匹配范围，使用只含测试数据的集合核对精确命中、不匹配及批量范围，写后回读实际结果。 观察回调与写入的时序。",
    },
    callback: 5,
  },
  MongoDBDeleteMany: {
    family: "mongo",
    signature: "MongoDBDeleteMany(alias, collection, filter)",
    usage:
      "await 版把调用者的条件放到请求 data，filter 对象本身只含 collection。该 Node Mongo DAO 也从 data 取删除条件。",
    result: "Promise<总状态码>。路径只消费回包的总错误码，成功默认为 0。",
    effect: "删除文档",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "重点核对目标 Mongo 适配器如何解释两个字段。先在测试集合检查删除前后命中文档和旁路对照文档。",
    },
  },
  AsynMongoDBDeleteMany: {
    family: "mongo",
    signature: "AsynMongoDBDeleteMany(alias, collection, filter, callback)",
    usage:
      "该版把条件放到 filter.wherestr 且不发 data。该 Node Mongo DAO 却从 data 取删除条件，进入分支前会读 data._id，存在失败风险，暂缓给生成脚本使用。",
    result: "callback(code)。路径只消费回包的总错误码，成功默认为 0。",
    effect: "删除文档",
    source:
      "service/globalFuncMng/globalInterfaceMng/mongo_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "对照 await 版，用测试集合核对过滤对象位置、命中范围、回调和实际删除条数。",
    },
    callback: 4,
  },
  redisExists: {
    family: "redis",
    signature: "redisExists(alias, key)",
    usage:
      "向 Redis 适配器发送 exists，其 Node ioredis 路径直接回传命中结果。 已保存的连接名、键、字段和已提供的值均须为字符串。",
    result: "Promise<data 或错误码>。成功数据沿 HTTP 回包透传。",
    effect: "查询",
    source:
      "service/globalFuncMng/globalInterfaceMng/redis_global_interface.js",
    verification: {
      method: "KF 实机",
      check: "用存在、不存在和错连接的键核对返回类型及 0 的语义。",
    },
  },
  redisHget: {
    family: "redis",
    signature: "redisHget(alias, key, field)",
    usage:
      "向 Redis 适配器发送 hget，指定哈希键和字段。 已保存的连接名、键、字段和已提供的值均须为字符串。",
    result: "Promise<data 或错误码>。成功数据沿 HTTP 回包透传。",
    effect: "查询",
    source:
      "service/globalFuncMng/globalInterfaceMng/redis_global_interface.js",
    verification: {
      method: "KF 实机",
      check: "对照有值、空字符串、缺字段、缺键和键类型错误。",
    },
  },
  redisSet: {
    family: "redis",
    signature: "redisSet(alias, key, value)",
    usage:
      "发送 set。公开入口未提供 TTL 或 NX 参数。 已保存的连接名、键、字段和已提供的值均须为字符串。",
    result: "Promise<总状态码>。成功默认为 0，失败为适配器或配置错误码。",
    effect: "写缓存",
    source:
      "service/globalFuncMng/globalInterfaceMng/redis_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "确认测试键命名和覆盖规则，实测覆盖已有值、写后读值及旧 TTL 是否保留。",
    },
  },
  redisHset: {
    family: "redis",
    signature: "redisHset(alias, key, field, value)",
    usage:
      "发送 hset，指定哈希键、字段及字符串值。 已保存的连接名、键、字段和已提供的值均须为字符串。",
    result: "Promise<总状态码>。成功默认为 0，失败为适配器或配置错误码。",
    effect: "写缓存",
    source:
      "service/globalFuncMng/globalInterfaceMng/redis_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check: "用测试键核对创建字段、覆盖字段和类型错误。回读字段值验证结果。",
    },
  },
  redisDel: {
    family: "redis",
    signature: "redisDel(alias, key)",
    usage:
      "发送 del，指定一个键。包装不返回实际删除数。 已保存的连接名、键、字段和已提供的值均须为字符串。",
    result: "Promise<总状态码>。成功默认为 0，失败为适配器或配置错误码。",
    effect: "删除缓存",
    source:
      "service/globalFuncMng/globalInterfaceMng/redis_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check: "先确认键的归属，在测试键上分别验存在与缺失，回读验证删除范围。",
    },
  },
  redisHdel: {
    family: "redis",
    signature: "redisHdel(alias, key, field)",
    usage:
      "发送 hdel，指定一个键内的一个字段。 已保存的连接名、键、字段和已提供的值均须为字符串。",
    result: "Promise<总状态码>。成功默认为 0，失败为适配器或配置错误码。",
    effect: "删除缓存",
    source:
      "service/globalFuncMng/globalInterfaceMng/redis_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check: "在测试键确认指定字段删除、其他字段保留，并核对缺字段时的回执。",
    },
  },
  SubscribeRedundancyMessage: {
    family: "redundancy",
    signature: "SubscribeRedundancyMessage(callback)",
    usage:
      "初始快照消息为 REDUNDANCY_EVENT_SNAPSHOT，payload 是当前 OPEN 事件集合。变更消息为 REDUNDANCY_EVENT_CHANGED，payload 为单条投影事件。 首个订阅会尝试连接。收到快照前缓存变更，已就绪时新增订阅可立即收到当前快照。断线后有重连逻辑，时间格式化采用固定 UTC+8 偏移。",
    result:
      "有效回调返回订阅 ID，无效回调返回 null。状态和事件通过 callback(message) 交付。",
    effect: "订阅事件",
    source: "service/globalFuncMng/redundancy_global_func.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "核对目标权限、首次快照顺序、恢复事件、断线重连和时间表示。在独立实例观察回调日志。",
    },
    callback: 1,
  },
  UnsubscribeRedundancyMessage: {
    family: "redundancy",
    signature: "UnsubscribeRedundancyMessage(subscriptionId)",
    usage: "删除最后一个回调会停止重连、关闭连接并清理快照。",
    result: "同步返回布尔值，表示订阅 ID 是否被删除。",
    effect: "取消订阅",
    source: "service/globalFuncMng/redundancy_global_func.js",
    verification: {
      method: "KF 实机",
      check:
        "校验已知 ID、重复取消、两位订阅者的相互独立性，以及取消最后一位后的关闭情况。",
    },
  },
  getTokenbyUser: {
    family: "request",
    signature: "getTokenbyUser(username, password)",
    usage:
      "向配置的账号网关提交用户名密码，使用部署 OAuth 客户端和租户。失败信息从回包构造，异常回包结构的表现需另验。",
    result:
      "Promise<{code, message, token}>。按常规回包分支，成功时 token 为访问令牌，失败时 token 为 null。",
    effect: "身份认证",
    source: "service/globalFuncMng/request_global_func.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "在隔离账号验证有效与无效凭据、租户、异常回包和令牌有效期。记录时省去令牌及密码。",
    },
  },
  sendHttpRequestwithToken: {
    family: "request",
    signature:
      "sendHttpRequestwithToken(token, baseUrl, scriptName, inParam[, legacyArg])",
    usage:
      "Node 将 baseUrl 与 scriptName 直接拼接。入参 token 放请求正文，Authorization 使用计算运行态当前令牌。第五个形参在该版本未使用。 工程模板有不同实现，URL 带显式斜杠，第五参可参与回调。目标请求式脚本可以包含写入，因此需核对目的和权限。",
    result: "Promise<完整回包>。Node 回包有非零 errorCode 时以该回包拒绝。",
    effect: "调用其他计算脚本",
    source: "service/globalFuncMng/request_global_func.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "验证两种快照对应的已部署产物。用无副作用的专用请求脚本核对 URL、有效身份、业务错误和失败传播。",
    },
    minimumArgs: 4,
  },
  sendHttpRequestwithUser: {
    family: "request",
    signature:
      "sendHttpRequestwithUser(username, password, baseUrl, scriptName, inParam, callback)",
    usage:
      "先调用 getTokenbyUser，再调用 sendHttpRequestwithToken。请求拒绝时该快照没有本地捕获，可能跳过回调并使外层 Promise 拒绝。",
    result:
      "认证成功并请求成功时调用 callback(response)，认证失败时调用 callback(message)。外层 Promise 不返回响应行。",
    effect: "认证并调用其他计算脚本",
    source: "service/globalFuncMng/request_global_func.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "隔离账号下核对成功、账号无效、目标拒绝、目标超时与回调次数。核对目标脚本的副作用。",
    },
    callback: 6,
  },
  batchCreateUser: {
    family: "user",
    signature: "batchCreateUser(userInfo, token[, timeoutMs])",
    usage:
      "userInfo 为账号对象数组，计算包装以 userInfoArr 提交。对象含 password 时原地改成 Base64 字符串，勿复用原数组做重试。 默认超时 15000ms，要求相应租户范围及账号权限。",
    result: "Promise<网关 data 或错误信息>。完整回执按账号接口的返回分支解释。",
    effect: "创建账号",
    source: "service/globalFuncMng/globalInterfaceMng/user_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "确认租户和允许的账号类型、默认角色与分组。用测试账号覆盖重复用户名、部分失败和创建后的权限。",
    },
    minimumArgs: 2,
  },
  batchModifyUser: {
    family: "user",
    signature: "batchModifyUser(userInfo, token[, timeoutMs])",
    usage:
      "计算包装以 userInfoArr 提交，存在 password 时会原地转换。控制器按 userId 定位，部分省略字段会填默认值，不能按通用局部更新理解。 默认超时 15000ms，要求相应租户范围及账号权限。",
    result: "Promise<网关 data 或错误信息>。完整回执按账号接口的返回分支解释。",
    effect: "修改账号",
    source: "service/globalFuncMng/globalInterfaceMng/user_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "核对可修改字段、默认角色与分组是否覆盖旧值，按账号逐项回读。密码变更另从重置路径验证。",
    },
    minimumArgs: 2,
  },
  batchQueryUser: {
    family: "user",
    signature: "batchQueryUser(userNames, token[, timeoutMs])",
    usage:
      "计算包装以 userNameArr 提交名称数组。服务侧先取当前操作者可见用户，再按名字筛选。 默认超时 15000ms，要求相应租户范围及账号权限。",
    result: "Promise<网关 data 或错误信息>。完整回执按账号接口的返回分支解释。",
    effect: "查询账号",
    source: "service/globalFuncMng/globalInterfaceMng/user_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "用测试账号验有权限、无权限、重名及不存在用户，核对可见范围和回包字段。",
    },
    minimumArgs: 2,
  },
  batchResetPassword: {
    family: "user",
    signature: "batchResetPassword(userInfo, token[, timeoutMs])",
    usage:
      "计算包装以 userInfoArr 提交。服务侧取每项 userId 与 password。当前服务代码的批处理把单项回调收束为 0，不能仅根据总返回确认重置结果。 默认超时 15000ms，要求相应租户范围及账号权限。",
    result: "Promise<网关 data 或错误信息>。完整回执按账号接口的返回分支解释。",
    effect: "重置凭据",
    source: "service/globalFuncMng/globalInterfaceMng/user_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "核对租户权限、密码策略和旧凭据失效。只用专用测试账户，按实际登录或审计回执检查结果。",
    },
    minimumArgs: 2,
  },
  batchDeleteUser: {
    family: "user",
    signature: "batchDeleteUser(userIds, token[, timeoutMs])",
    usage:
      "计算包装下发 userIdArr。控制器按 ID 检查目标存在性以及当前操作者权限。 默认超时 15000ms，要求相应租户范围及账号权限。",
    result: "Promise<网关 data 或错误信息>。完整回执按账号接口的返回分支解释。",
    effect: "删除账号",
    source: "service/globalFuncMng/globalInterfaceMng/user_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "仅用测试账号，验证部分失败、无权目标和删除后可见性，不使用高权限或现有业务账号。",
    },
    minimumArgs: 2,
  },
  LoadDllFile: {
    family: "dll",
    signature: "LoadDllFile(fileName, output)",
    usage:
      "入口要求正好两个实参，首参为字符串。在其预置模块目录下解析 DLL 文件名。 包装调用 newDLLInterface，但同文件可见的 require 结果只绑定在 try 块内的另一个局部名。下层部分调用也使用未限定的 dllNodecall。需核对目标产物中的实际绑定。 仅适用于 Windows 注册路径，要求目标机的 win64 原生依赖。",
    result: "Promise<原生状态码> 为实现意图，成功分支向 output.handle 赋值。",
    effect: "加载原生模块",
    source: "service/globalFuncMng/globalInterfaceMng/dll_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "人工核对当前 DLL、进程位数、依赖和输出对象结构。只用内部测试模块验证成功、缺文件和句柄状态。",
    },
  },
  ExecuteDllFunction: {
    family: "dll",
    signature: "ExecuteDllFunction(handle, functionName, input, output)",
    usage:
      "入口检查 handle 为数字、functionName 为字符串、input 为 object。下层读取并删除 input.len，剩余字段序列化后传入原生模块。 包装调用 newDLLInterface，但同文件可见的 require 结果只绑定在 try 块内的另一个局部名。下层部分调用也使用未限定的 dllNodecall。需核对目标产物中的实际绑定。 仅适用于 Windows 注册路径，要求目标机的 win64 原生依赖。",
    result:
      "Promise<原生状态码> 为实现意图，成功分支向 output.FuncResult 赋值。",
    effect: "执行原生函数",
    source: "service/globalFuncMng/globalInterfaceMng/dll_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "人工确认原生功能及入参约定，在专用模块测入参副作用、返回、错误和超时。",
    },
  },
  UnloadDllFile: {
    family: "dll",
    signature: "UnloadDllFile(handle)",
    usage:
      "只接受一个数字句柄。下层没有可见的句柄生命周期保证。 包装调用 newDLLInterface，但同文件可见的 require 结果只绑定在 try 块内的另一个局部名。下层部分调用也使用未限定的 dllNodecall。需核对目标产物中的实际绑定。 仅适用于 Windows 注册路径，要求目标机的 win64 原生依赖。",
    result: "Promise<原生状态码> 为实现意图，参数类型错误返回 -2。",
    effect: "释放原生模块",
    source: "service/globalFuncMng/globalInterfaceMng/dll_global_interface.js",
    verification: {
      method: "人工核对 + KF 实机",
      check:
        "用目标 Windows 进程和专用模块核对卸载、失效或重复句柄、资源释放及并发调用的行为。",
    },
  },
};
// end
