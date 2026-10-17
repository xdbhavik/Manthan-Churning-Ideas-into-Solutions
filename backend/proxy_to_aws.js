import http from 'node:http';
import https from 'node:https';

const AWS_IP = '13.205.158.156';
const AWS_HOST = 'api.bhavik.site';
const PORT = 8080;

const server = http.createServer((clientReq, clientRes) => {
  clientRes.setHeader('Access-Control-Allow-Origin', '*');
  clientRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  clientRes.setHeader('Access-Control-Allow-Headers', '*');
  clientRes.setHeader('Access-Control-Expose-Headers', '*');

  if (clientReq.method === 'OPTIONS') {
    clientRes.writeHead(204);
    clientRes.end();
    return;
  }

  const headers = { ...clientReq.headers, host: AWS_HOST };
  delete headers['content-length'];

  const options = {
    host: AWS_IP,
    port: 443,
    path: clientReq.url,
    method: clientReq.method,
    servername: AWS_HOST,
    headers: {
      ...clientReq.headers,
      host: AWS_HOST
    }
  };

  const proxy = https.request(options, (res) => {
    const resHeaders = { ...res.headers };
    resHeaders['access-control-allow-origin'] = '*';
    clientRes.writeHead(res.statusCode, resHeaders);
    res.pipe(clientRes, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy Error:', err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'Gateway Proxy Error', details: err.message }));
    }
  });

  clientReq.pipe(proxy, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[AWS Tunnel] Listening on http://localhost:${PORT} -> https://${AWS_HOST} (${AWS_IP})`);
});
