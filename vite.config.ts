import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { URL } from 'url'

// Emulador de Vercel Serverless Functions en modo Dev
const vercelApiPlugin = () => ({
  name: 'vercel-api-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (req.url?.startsWith('/api/')) {
        const url = new URL(req.url, 'http://localhost');
        const apiPath = url.pathname.replace(/^\/api\//, '');
        try {
          const modulePath = `./api/${apiPath}.ts`;
          const handlerModule = await server.ssrLoadModule(modulePath);
          
          let body = {};
          if (req.method === 'POST') {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(chunk as Buffer);
            }
            const data = Buffer.concat(buffers).toString();
            try {
              body = JSON.parse(data);
            } catch {
              body = data;
            }
          }
          
          const vercelReq = Object.assign(req, {
            body,
            query: Object.fromEntries(url.searchParams)
          });
          
          const vercelRes = Object.assign(res, {
            status(statusCode: number) {
              res.statusCode = statusCode;
              return vercelRes;
            },
            json(data: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return vercelRes;
            },
            send(data: any) {
              res.end(data);
              return vercelRes;
            }
          });

          await handlerModule.default(vercelReq, vercelRes);
        } catch (err: any) {
          console.error(`Error en API /api/${apiPath}:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
        }
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiPlugin()],
})
