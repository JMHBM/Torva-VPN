"use strict";

const http = require("node:http");
const net = require("node:net");
const assert = require("node:assert/strict");
const { ProxyBridge, socks5Connect, isLanHost, splitHostPort } = require("./proxy.cjs");

function listen(server, port = 0) {
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function startOrigin() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`ok ${req.url}`);
  });
  const port = await listen(server);
  return { server, port };
}

async function startSocks(originPort) {
  const server = net.createServer((client) => {
    let stage = 0;
    let buf = Buffer.alloc(0);
    client.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (stage === 0 && buf.length >= 3 && buf[0] === 5) {
        const nmethods = buf[1];
        if (buf.length < 2 + nmethods) return;
        buf = buf.subarray(2 + nmethods);
        client.write(Buffer.from([5, 0]));
        stage = 1;
      }
      if (stage === 1 && buf.length >= 5 && buf[0] === 5 && buf[3] === 3) {
        const hlen = buf[4];
        const need = 5 + hlen + 2;
        if (buf.length < need) return;
        const rest = buf.subarray(need);
        buf = Buffer.alloc(0);
        client.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
        const remote = net.connect({ host: "127.0.0.1", port: originPort });
        remote.on("connect", () => {
          if (rest.length) remote.write(rest);
          client.pipe(remote);
          remote.pipe(client);
        });
        remote.on("error", () => client.destroy());
        stage = 2;
      }
    });
  });
  const port = await listen(server);
  return { server, port };
}

async function main() {
  assert.equal(isLanHost("192.168.1.20"), true);
  assert.equal(isLanHost("10.0.0.4"), true);
  assert.equal(isLanHost("8.8.8.8"), false);
  assert.equal(splitHostPort("example.com:443", 80).port, 443);

  const origin = await startOrigin();
  const socks = await startSocks(origin.port);
  const sock = await socks5Connect("example.com", origin.port, {
    socks: { host: "127.0.0.1", port: socks.port },
  });
  sock.write(`GET /hello HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n`);
  let body = "";
  for await (const chunk of sock) body += chunk.toString();
  assert.match(body, /ok \/hello/);

  const bridge = new ProxyBridge();
  bridge.socks = { host: "127.0.0.1", port: socks.port };
  bridge.isolate = false;
  await bridge.listen(19190);
  bridge.setMode("tor");

  const via = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: bridge.port,
        path: "http://example.com/proxy",
        headers: { Host: "example.com" },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.match(via, /ok \/proxy/);

  bridge.setMode("block");
  const blocked = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: bridge.port,
        path: "http://example.com/nope",
        headers: { Host: "example.com" },
      },
      (res) => resolve(res.statusCode),
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(blocked, 403);

  await bridge.close();
  socks.server.close();
  origin.server.close();
  console.log("proxy tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
