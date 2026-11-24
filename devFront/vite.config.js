// modified by jinlong.feng at 2026-11-19 开发态前端本地启动
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig, loadEnv } from 'vite';

// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { editorProxy } from './assistant-editor-proxy.js';
// end
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const apiPrefix = '/api';
const localOemAssets = ['login.png', 'logo.png', 'leftIcon.png'];

function localLoginPreview() {
  const images = new Map(
    localOemAssets.map(name => [
      `${apiPrefix}/oem/oemImg/${name}`,
      readFileSync(new URL(`./preview-oem/${name}`, import.meta.url)),
    ]),
  );

  function configurePreview(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = req.url.split('?', 1)[0];
      // modified by jinlong.feng at 2026-11-20 KF开发助手M1
      if (pathname.startsWith('/api/assistant/')) return next();
      // end
      if (pathname !== apiPrefix && !pathname.startsWith(`${apiPrefix}/`)) {
        next();
        return;
      }

      const image = images.get(pathname);
      if (req.method === 'GET' && image) {
        res.setHeader('Content-Type', 'image/png');
        res.end(image);
        return;
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method === 'GET' && pathname === `${apiPrefix}/system/oemConfig`) {
        res.end(JSON.stringify({ errorCode: 0, data: { companyName: '', subItemList: [] } }));
        return;
      }

      res.statusCode = 503;
      res.end(JSON.stringify({ message: '请在 .env.local 配置 KF_DEV_BACKEND_ORIGIN 后重启服务。' }));
    });
  }

  return {
    name: 'kf-local-login-preview',
    configureServer: configurePreview,
    configurePreviewServer: configurePreview,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, ['KF_DEV_', 'VITE_']);
  const backendOrigin = env.KF_DEV_BACKEND_ORIGIN?.trim();
  // modified by jinlong.feng at 2026-11-20 客户端编辑器连接验证
  const proxy = backendOrigin
    ? Object.fromEntries([apiPrefix, '/ws', '/placeholder', '/kingclient', '/socket.io'].map(path => [path, {
      target: backendOrigin,
      changeOrigin: true,
      secure: env.KF_DEV_BACKEND_INSECURE !== 'true',
      ws: true,
    }]))
    : undefined;
  // end
// modified by jinlong.feng at 2026-11-20 KF开发助手M1
  const assistantEnabled=env.VITE_KF_ASSISTANT_ENABLED!=='false';
  const assistantProxy=assistantEnabled ? {
    '/api/assistant/':{target:env.KF_DEV_ASSISTANT_ORIGIN || 'http://127.0.0.1:43170',changeOrigin:true},
    ...(backendOrigin?{'^/kingclient/index\\.html(?:\\?|$)':editorProxy(backendOrigin, env.KF_DEV_BACKEND_INSECURE!=='true')}:{})
  } : {};
  const devProxy={...assistantProxy,...proxy};
// end
  const routes = [
    'system-overview', 'client', 'datasource', 'calculate', 'alarm', 'collection',
    'gatewayLog_manager', 'user_manager', 'permission_manager',
  ];
  const defaults = {
    VITE_LANGUAGE: 'zh',
    VITE_PROXY_DOMAIN: apiPrefix,
    VITE_ROUTE_DEFAULT: '/login',
    VITE_ROUTE_MAIN: JSON.stringify(routes),
  };
  const elementPlusResolver = ElementPlusResolver({ importStyle: false });

  return {
    root: projectRoot,
    base: './',
    plugins: [
      vue({
        template: {
          compilerOptions: { isCustomElement: tag => tag === 'l-dot-spinner' },
        },
      }),
      AutoImport({ imports: ['vue', 'pinia'], resolvers: [elementPlusResolver], dts: false }),
      Components({
        resolvers: [elementPlusResolver, IconsResolver({ prefix: 'i', enabledCollections: ['ep'] })],
        dts: false,
      }),
      Icons({ compiler: 'vue3' }),
      ...(backendOrigin ? [] : [localLoginPreview()]),
    ],
    define: Object.fromEntries(Object.entries(defaults).map(([key, value]) => [
      `import.meta.env.${key}`, JSON.stringify(env[key] ?? value),
    ])),
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
// modified by jinlong.feng at 2026-11-20 KF开发助手M1
    build: {rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),assistant:fileURLToPath(new URL('./assistant.html',import.meta.url))}}},
    server: { host: '127.0.0.1', port: 5175, strictPort: true, proxy:devProxy },
    preview: { host: '127.0.0.1', port: 4175, strictPort: true, proxy:devProxy },
// end
  };
});
// end
