"use strict";

const http = require("node:http");
const net = require("node:net");
const { once } = require("node:events");

const DEFAULT_SOCKS = { host: "127.0.0.1", port: 9052 };
const DEFAULT_LISTEN = 8118;

class ByteReader {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.waiters = [];
    this.closed = false;
    this._onData = (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this._flush();
    };
    this._onEnd = () => {
      this.closed = true;
      for (const w of this.waiters) w.reject(new Error("socket closed"));
      this.waiters = [];
    };
    socket.on("data", this._onData);
    socket.once("end", this._onEnd);
    socket.once("close", this._onEnd);
    socket.once("error", (err) => {
      this.closed = true;
      for (const w of this.waiters) w.reject(err);
      this.waiters = [];
    });
  }

  take(n) {
    return new Promise((resolve, reject) => {
      if (this.closed && this.buf.length < n) {
        reject(new Error("socket closed"));
        return;
      }
      this.waiters.push({ n, resolve, reject });
      this._flush();
    });
  }

  _flush() {
    while (this.waiters.length && this.buf.length >= this.waiters[0].n) {
      const w = this.waiters.shift();
      const out = this.buf.subarray(0, w.n);
      this.buf = this.buf.subarray(w.n);
      w.resolve(out);
    }
  }

  detach() {
    this.socket.off("data", this._onData);
    if (this.buf.length) this.socket.unshift(this.buf);
    this.buf = Buffer.alloc(0);
    this.waiters = [];
  }
}

function packPort(port) {
  return Buffer.from([(port >> 8) & 0xff, port & 0xff]);
}

function isLanHost(host) {
  const h = String(host || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".lan") || h.endsWith(".home")) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function splitHostPort(authority, fallbackPort) {
  const raw = String(authority || "").trim();
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    const host = raw.slice(1, end);
    const rest = raw.slice(end + 1);
    const port = rest.startsWith(":") ? Number(rest.slice(1)) : fallbackPort;
    return { host, port };
  }
  const idx = raw.lastIndexOf(":");
  if (idx > 0 && raw.indexOf(":") === idx) {
    return { host: raw.slice(0, idx), port: Number(raw.slice(idx + 1)) || fallbackPort };
  }
  return { host: raw, port: fallbackPort };
}

async function socks5Connect(host, port, opts = {}) {
  const socks = opts.socks || DEFAULT_SOCKS;
  const timeoutMs = opts.timeoutMs || 20000;
  const socket = net.connect({ host: socks.host, port: socks.port });
  socket.setNoDelay(true);

  const timer = setTimeout(() => {
    socket.destroy(new Error("SOCKS timeout"));
  }, timeoutMs);

  try {
    await once(socket, "connect");
    const reader = new ByteReader(socket);
    const user = opts.username;
    const pass = opts.password || "x";

    if (user) {
      socket.write(Buffer.from([0x05, 0x01, 0x02]));
      const sel = await reader.take(2);
      if (sel[1] !== 0x02) throw new Error("SOCKS5 rejected username auth");
      const ub = Buffer.from(String(user));
      const pb = Buffer.from(String(pass));
      socket.write(Buffer.concat([Buffer.from([0x01, ub.length]), ub, Buffer.from([pb.length]), pb]));
      const auth = await reader.take(2);
      if (auth[1] !== 0x00) throw new Error("SOCKS5 username auth failed");
    } else {
      socket.write(Buffer.from([0x05, 0x01, 0x00]));
      const sel = await reader.take(2);
      if (sel[1] !== 0x00) throw new Error("SOCKS5 no-auth rejected");
    }

    const hb = Buffer.from(String(host));
    if (hb.length > 255) throw new Error("hostname too long");
    socket.write(
      Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, hb.length]), hb, packPort(port)]),
    );
    const hdr = await reader.take(4);
    if (hdr[0] !== 0x05 || hdr[1] !== 0x00) {
      throw new Error(`SOCKS5 connect failed (${hdr[1]})`);
    }
    if (hdr[3] === 0x01) await reader.take(6);
    else if (hdr[3] === 0x04) await reader.take(18);
    else if (hdr[3] === 0x03) {
      const len = await reader.take(1);
      await reader.take(len[0] + 2);
    } else {
      throw new Error("SOCKS5 unknown address type");
    }
    reader.detach();
    return socket;
  } catch (err) {
    socket.destroy();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function directConnect(host, port, timeoutMs = 12000) {
  const socket = net.connect({ host, port });
  socket.setNoDelay(true);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("direct connect timeout"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function pipeSockets(a, b) {
  a.pipe(b);
  b.pipe(a);
  const kill = () => {
    a.destroy();
    b.destroy();
  };
  a.on("error", kill);
  b.on("error", kill);
}

class ProxyBridge {
  constructor() {
    this.server = null;
    this.port = DEFAULT_LISTEN;
    this.mode = "off";
    this.allowLan = true;
    this.isolate = true;
    this.socks = { ...DEFAULT_SOCKS };
  }

  async listen(preferredPort = DEFAULT_LISTEN) {
    if (this.server) return this.port;
    const ports = [preferredPort, 8119, 8218, 19180];
    let lastErr = null;
    for (const port of ports) {
      try {
        await this._listen(port);
        this.port = port;
        return port;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("could not bind local proxy");
  }

  _listen(port) {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        void this._handleHttp(req, res);
      });
      server.on("connect", (req, socket, head) => {
        void this._handleConnect(req, socket, head);
      });
      server.on("error", reject);
      server.listen(port, "127.0.0.1", () => {
        server.off("error", reject);
        this.server = server;
        resolve();
      });
    });
  }

  setMode(mode) {
    this.mode = mode;
  }

  async close() {
    const server = this.server;
    this.server = null;
    this.mode = "off";
    if (!server) return;
    await new Promise((resolve) => server.close(() => resolve()));
  }

  _shouldDirect(host) {
    return this.allowLan && isLanHost(host);
  }

  async _openRemote(host, port) {
    if (this._shouldDirect(host)) return directConnect(host, port);
    if (this.mode !== "tor") throw new Error("proxy is fail-closed");
    const username = this.isolate ? `torva:${host}` : undefined;
    return socks5Connect(host, port, { socks: this.socks, username, password: "torva" });
  }

  async _handleConnect(req, client, head) {
    const { host, port } = splitHostPort(req.url, 443);
    if (this.mode === "off" || (this.mode === "block" && !this._shouldDirect(host))) {
      try {
        client.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      } catch {
        /* ignore */
      }
      client.destroy();
      return;
    }
    try {
      const remote = await this._openRemote(host, port);
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head && head.length) remote.write(head);
      pipeSockets(client, remote);
    } catch {
      try {
        client.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
      } catch {
        /* ignore */
      }
      client.destroy();
    }
  }

  async _handleHttp(req, res) {
    let url;
    try {
      url = new URL(req.url);
    } catch {
      res.writeHead(400, { Connection: "close" });
      res.end("bad request");
      return;
    }
    const host = url.hostname;
    const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
    if (this.mode === "off" || (this.mode === "block" && !this._shouldDirect(host))) {
      res.writeHead(403, { Connection: "close" });
      res.end("kill switch");
      return;
    }
    let remote;
    try {
      remote = await this._openRemote(host, port);
    } catch {
      res.writeHead(502, { Connection: "close" });
      res.end("bad gateway");
      return;
    }
    const pathName = `${url.pathname}${url.search}`;
    const headers = { ...req.headers, host: url.host, connection: "close" };
    delete headers["proxy-connection"];
    const lines = [`${req.method} ${pathName} HTTP/1.1`];
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) for (const item of v) lines.push(`${k}: ${item}`);
      else lines.push(`${k}: ${v}`);
    }
    remote.write(`${lines.join("\r\n")}\r\n\r\n`);

    let buf = Buffer.alloc(0);
    let headed = false;
    const fail = () => {
      try {
        if (!res.headersSent) res.writeHead(502, { Connection: "close" });
        res.end();
      } catch {
        /* ignore */
      }
      remote.destroy();
    };
    remote.on("data", (chunk) => {
      if (headed) {
        res.write(chunk);
        return;
      }
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf("\r\n\r\n");
      if (idx < 0) return;
      const head = buf.subarray(0, idx).toString("latin1");
      const rest = buf.subarray(idx + 4);
      const statusLine = head.split("\r\n")[0] || "";
      const code = Number(statusLine.split(" ")[1]) || 502;
      const outHeaders = { connection: "close" };
      for (const line of head.split("\r\n").slice(1)) {
        const colon = line.indexOf(":");
        if (colon < 1) continue;
        const key = line.slice(0, colon).trim().toLowerCase();
        if (key === "transfer-encoding" || key === "connection" || key === "proxy-connection") continue;
        outHeaders[key] = line.slice(colon + 1).trim();
      }
      res.writeHead(code, outHeaders);
      headed = true;
      if (rest.length) res.write(rest);
    });
    remote.on("end", () => {
      if (!headed) fail();
      else res.end();
    });
    remote.on("error", fail);
    req.on("error", () => remote.destroy());
    if (!req.readableEnded) req.pipe(remote, { end: false });
  }
}

async function fetchThroughSocks(host, path, opts = {}) {
  const tls = require("node:tls");
  const sock = await socks5Connect(host, 443, opts);
  const tlsSock = tls.connect({ socket: sock, servername: host, ALPNProtocols: ["http/1.1"] });
  await once(tlsSock, "secureConnect");
  tlsSock.write(
    `GET ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: TorvaVPN/1.0\r\nAccept: application/json\r\nConnection: close\r\n\r\n`,
  );
  const chunks = [];
  for await (const chunk of tlsSock) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  const idx = raw.indexOf("\r\n\r\n");
  const body = idx >= 0 ? raw.slice(idx + 4) : raw;
  return body;
}

module.exports = {
  ProxyBridge,
  socks5Connect,
  isLanHost,
  splitHostPort,
  fetchThroughSocks,
};
