// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib';
// Only the native 2D editor HTML response passes here. Its document URL, scripts,
// WebSocket, requests and browsing context remain the native editor's.
export function editorProxy(target, secure) {
  return {
    target,
    secure,
    changeOrigin: true,
    selfHandleResponse: true,
    configure(proxy) {
      proxy.on('proxyReq', (upstream) => {
        upstream.setHeader('accept-encoding', 'identity');
        upstream.removeHeader('if-none-match');
        upstream.removeHeader('if-modified-since');
      });
      proxy.on('proxyRes', (upstream, _req, res) => {
        const headers = { ...upstream.headers };
        if (upstream.statusCode !== 200 || !String(headers['content-type']).includes('text/html')) {
          res.writeHead(upstream.statusCode || 502, headers);
          upstream.pipe(res);
          return;
        }
        const chunks = [];
        upstream.on('data', (chunk) => chunks.push(chunk));
        upstream.on('error', () => res.destroy());
        upstream.on('end', () => {
          const raw = Buffer.concat(chunks);
          let html;
          try {
            const decoders = { gzip: gunzipSync, deflate: inflateSync, br: brotliDecompressSync };
            const encoding = headers['content-encoding'];
            if (encoding && encoding !== 'identity' && !decoders[encoding]) throw Error();
            html = (decoders[encoding] ? decoders[encoding](raw) : raw).toString('utf8');
          } catch {
            res.writeHead(200, headers);
            res.end(raw);
            return;
          }
          if (!html.includes('src="/kf-assistant-editor.js"'))
            html = html.replace(
              /<\/head\s*>/i,
              '<script defer src="/kf-assistant-editor.js"></script></head>',
            );
          for (const key of [
            'content-length',
            'content-encoding',
            'etag',
            'transfer-encoding',
            'content-md5',
          ])
            delete headers[key];
          headers['cache-control'] = 'no-store';
          res.writeHead(200, headers);
          res.end(html);
        });
      });
    },
  };
}
// end
