<!-- modified by jinlong.feng at 2026-11-19 开发态前端本地启动 -->
# KingFusion 3.6 开发态前端

使用 Node.js 22.12+。在 `devFront` 目录执行：

```sh
npm ci
npm run dev
```

打开 [本地开发态](http://127.0.0.1:5175/#/login)。修改 `src/` 会触发 Vite 热更新。

<!-- modified by jinlong.feng at 2026-11-20 KF开发助手M1 -->
开发助手使用同源 `/api/assistant/`。先按助手服务运行手册启动本机服务，再从开发中心顶栏、二维页面新标签或计算工程的周期脚本打开助手。默认助手端口为 43170。用 `KF_DEV_ASSISTANT_ORIGIN` 覆盖目标，`VITE_KF_ASSISTANT_ENABLED=false` 可在重新启动或构建后关闭助手入口。
<!-- end -->

<!-- modified by jinlong.feng at 2026-11-20 客户端编辑器连接验证 -->
后端配置保存在 `.env.local`，可从 `.env.example` 创建。设置 `KF_DEV_BACKEND_ORIGIN` 为 KF 开发态入口的协议、地址和端口，修改后重启 Vite。当前工作区使用 `https://192.0.2.1`。该测试服务器使用自签名证书，本地代理通过 `KF_DEV_BACKEND_INSECURE=true` 接入，登录与业务请求使用原有 KF 服务。代理转发 `/api`、`/ws`、`/placeholder`、`/kingclient` 路径前缀，以及 3D 编辑器使用的 `/socket.io`。
<!-- end -->

留空时可预览登录页，登录和工程操作需连接 KF 后端。生产构建使用 `npm run build`，输出到 `dist/`。可用 `npm run preview` 在 [本地预览构建](http://127.0.0.1:4175/#/login)。

业务源码来自 2026-11-19 的 `frontend-source/src`。同批发布包提供了页面资源、SVG 图标和全局样式的恢复依据。原始构建配置缺失，依赖版本根据发布包中的信息确认或选用兼容版本，由 `package-lock.json` 固定。
<!-- end -->
