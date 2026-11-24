# CodeOAgent · KF 开发助手

面向 KingFusion 3.6 开发中心的工程助手。通过 OpenCode 和只读 MCP 查询普通账号有权访问的工程配置、跨工程引用及运行回执。支持个人方案、跨入口续聊，按已确认口径编写和校验 KF 计算脚本。

| 目录 | 内容 |
| --- | --- |
| [dev/agent](dev/agent) | Node.js 服务、OpenCode／MCP、计算函数目录、脚本校验、示例、本地测试及运行页观察扩展 |
| [devFront](devFront) | 完整 Vue 开发中心前端源码、助手浮窗和原生编辑器入口 |
| [docs](docs) | 实施计划、能力清单、静态索引和公开版验收资料 |
| [kf-reference](kf-reference) | 测试与接口说明引用的脱敏 KF 源码片段 |

## 本地启动

使用 Node.js 24.12+。先运行后端，再启动前端。

```sh
cd dev/agent
npm ci --include=optional
cp .env.example .env
npm start
```

```sh
cd devFront
npm ci --include=optional
cp .env.example .env.local
npm run dev
```

运行前将两处配置指向同一个有权访问的 KF Center。助手默认监听 `127.0.0.1:43170`，开发中心默认监听 `127.0.0.1:5175`。模型默认关闭，模型和 KF 凭据由部署者在本地提供。

## 验证与阅读

- 在 `dev/agent` 执行 `npm test`，运行本地服务、权限、脚本与源码样本回归。
- 在 `devFront` 执行 `npm run build`，编译开发中心和助手入口。
- 从仓库根目录运行 `node scripts/audit-kf-assistant-capabilities.mjs --check`，核对当前能力台账的源码路径与路由。
- [后端运行手册](dev/agent/README.md) · [前端运行手册](devFront/README.md) · [实施计划](docs/KF_DEVELOPMENT_ASSISTANT_V1_ARCHITECTURE_AND_PLAN.md) · [能力清单](docs/KF_DEVELOPMENT_ASSISTANT_CAPABILITIES.md) · [验证资料说明](docs/audits/README.md)

现场集成需要独立的 KF 安装与有权账号。参考源码只供阅读和回归。仓库中的发布记录分别标明源码依据、本地回归和指定 App 验收结果。
