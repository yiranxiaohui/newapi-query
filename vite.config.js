import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import https from 'https'

function corsProxyPlugin() {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/cors-proxy/')) return next();

        const target = req.headers['x-proxy-target'];
        if (!target) {
          res.writeHead(400);
          res.end('Missing X-Proxy-Target header');
          return;
        }

        let parsedTarget;
        try {
          parsedTarget = new URL(target);
        } catch {
          res.writeHead(400);
          res.end('Invalid X-Proxy-Target URL');
          return;
        }

        // /cors-proxy/api/log/self?p=1 → /api/log/self?p=1
        const pathAndQuery = req.url.slice('/cors-proxy'.length);
        const mod = parsedTarget.protocol === 'https:' ? https : http;

        // 转发所有请求头，仅移除代理/浏览器专属头
        const fwdHeaders = { ...req.headers, host: parsedTarget.host };
        delete fwdHeaders['origin'];
        delete fwdHeaders['referer'];
        delete fwdHeaders['x-proxy-target'];
        delete fwdHeaders['connection'];
        delete fwdHeaders['accept-encoding'];

        const proxyReq = mod.request(
          {
            hostname: parsedTarget.hostname,
            port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
            path: pathAndQuery,
            method: req.method,
            headers: fwdHeaders,
          },
          (proxyRes) => {
            const resHeaders = { ...proxyRes.headers };
            resHeaders['access-control-allow-origin'] = '*';
            resHeaders['access-control-allow-headers'] = '*';
            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on('error', (err) => {
          res.writeHead(502);
          res.end('Proxy error: ' + err.message);
        });

        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), corsProxyPlugin()],
})
