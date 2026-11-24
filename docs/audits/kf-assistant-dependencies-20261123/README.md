<!-- modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读 -->
# 计算工程脚本依赖的配置、引用和运行回执

服务版 `50342cac4f3a` 在 124 项通用回归和开发态构建通过后冻结。随后在 192.0.2.1 新建窑炉批次工程 `测试工程-27`。同一普通账号完成用户包安装、两份 ZIP 登记、发布和独立 App 部署。三类依赖分别保留一次成功和一次失败。已在本机 M6 的原对话重新打开三个菜单并逐行核对。冻结清单 · 六次运行回执 · 浏览器验收程序

## 在原对话复查

1. 用原普通账号登录本机 M6，打开「计算管理 → 默认工程组 → 测试工程-27 → 脚本依赖」。
2. 对 npm 和普通文件展开 JavaScript 分支，分别进入「NPM依赖」或「普通依赖」。对 Python 直接点「Python」。
3. 打开「开发助手 → 园区能源总览 → 第一段对话 → 工程工具 → 脚本依赖与运行回执」。先留空点「查询」，逐条查看已登记项和该工程在本段对话中捕获的运行结果。输入完整登记名可以缩小范围；普通文件与 Python 还可指定同包文件。每类可查到本次试点的两条回执。
4. 如需重新取证，在对应菜单输入下表中的登记名和文件名并查询，将目标计算 App 选为 `测试工程-27`，填写对应请求脚本名，点「关联一次请求回包」。通过已登录的调用端向该入口发一次 normal 请求，在十分钟内选择这次调用的含响应正文 HAR，再点查询。浏览器在本机提取业务回包后给助手。切换到其他工程时，先将助手给出的核对正文保存至该工程一个启用的同名脚本和函数，发布并部署后再取证。
5. 自由提问可用「当前工程有哪些脚本依赖？分别说明配置入口和引用写法，按目标 App 的回执列出加载版本、文件读数、Python 解释器及失败原因。」本轮验证浏览器工程工具和本机回读，未调用外部模型。

| 登记名 | 同包文件 / 调用参数 | 请求脚本 | 实机回包 |
| --- | --- | --- | --- |
| is-number@7.0.0 | `expectedVersion="7.0.0"` | LoadBatchLibrary | 从项目的 node_modules 加载 is-number，实际版本 7.0.0 |
| is-number@7.0.0 | `expectedVersion="8.0.0"` | LoadBatchLibrary | 加载版本仍为 7.0.0，精确版本比较返回 VERSION_MISMATCH |
| KilnBatchCards1123 | batch.txt | ReadBatchCard | normal_modules/JS/KilnBatchCards1123/batch.txt；30 字节，内容为 `glaze=opal;batch=K73;limit=48`，末尾有换行 |
| KilnBatchCards1123 | other-batch.txt | ReadOtherCard | 同一目录，文件缺失，ENOENT |
| KilnBatchChecks1123 | 留空使用 index.py | ImportBatchCheck | /usr/bin/python3，3.7.9；入口成功导入为 index，并执行了对同包 kiln_units 的导入 |
| KilnBatchChecks1123 | optional_check.py | ImportOptionalCheck | 同一解释器启动，ModuleNotFoundError，缺少 absent_kf_kiln_option_1123 |

## 换到其他工程

**npm。** 在「JavaScript → NPM依赖 → 安装」填包名或版本规格，点击「下载」，检查安装输出并刷新清单。用户包按模块名引用，例如 `const isNumber = require("is-number")`。包的安装规格保留在登记名中。运行脚本先加载模块，再从实际解析入口向上找到同名包的 manifest 取得版本。系统包按编辑器实现从工程 Common/project.json 的 execPath 对应的 node_modules 定位。内置模块、ESM-only 包、私有仓库和复杂安装规格需另外核实。本次版本负例是请求对精确版本的要求与实际加载版本不同。原生安装框 · 编辑器依赖树

**普通文件。** 在「JavaScript → 普通依赖 → 导入」选择 ZIP。单文件归档使用一个 JS 入口，多文件归档在根目录放 index.js。归档名去掉 .zip 后是登记名。脚本可用 `require("./normal_modules/JS/登记名/入口.js")` 加载模块，数据文件按同一目录读取。回执展示本次尝试的绝对路径、文件大小和最多 160 字节的 UTF-8 预览。取证覆盖归档根目录的普通文件。原生导入入口 · 归档入口及目录规则

**Python。** 在「脚本依赖 → Python → 导入」选择 ZIP。单文件归档使用一个 .py 入口，多文件归档在根目录放 index.py。JS 脚本用 `path.join(__dirname, "normal_modules", "Python", 登记名, 入口名)` 定位，在目标 App 进程可用的解释器中执行或导入。此检查优先调用 python3，找不到该命令再试 python；由成功启动的 Python 进程返回解释器路径、版本、导入模块或实际异常。使用隔离模式，将当前归档目录加入模块搜索路径。归档导入不会安装 pip 依赖；虚拟环境和带原生扩展的包需要按实际部署核对。对模块的导入会执行模块顶层代码，取证使用开发人员确认的项目模块。请求式宿主加载

回执只描述指定实例在调用时的行为。助手检查当前账号的工程和实例权限、请求脚本的保存正文、调用地址、时间以及返回字段；归档登记相同不能证明内容自采样后一直未变。本轮保留原对话 13 轮历史，新增 6 条运行回执，实际云端答复措辞未复测。新工程自带 11 项系统 npm 依赖；验收准备时据此把安装前检查改为仅确认目标用户包尚未登记，冻结产品未更改。
<!-- end -->
