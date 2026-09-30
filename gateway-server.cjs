"use strict";

const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const FRONTEND_ROOT = __dirname;
const FRONTEND_RELEASE = path.join(FRONTEND_ROOT, "release");
const BACKEND_ROOT = process.env.SICKO_BACKEND_ROOT || "/home/sickosou/sicko-backend-prod";

const NEXT_SERVER = path.join(FRONTEND_RELEASE, "server.js");
const BACKEND_SERVER = path.join(BACKEND_ROOT, "dist", "src", "server.js");

const PUBLIC_PORT = Number(process.env.PORT || 3000);
const API_PREFIX = "/api/v1";
const STARTUP_TIMEOUT_MS = 30_000;

let stopping = false;
let gateway;
const children = new Map();

function log(message, extra) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  process.stdout.write(`[sicko-gateway] ${message}${payload}\n`);
}

function fatal(message, extra) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  process.stderr.write(`[sicko-gateway] FATAL ${message}${payload}\n`);
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function cleanChildEnv(extra = {}) {
  const env = { ...process.env, ...extra };

  // Child processes must be plain Node processes. They must not inherit
  // Passenger's process-loader state from the parent application.
  for (const key of Object.keys(env)) {
    if (key === "IN_PASSENGER" || key.startsWith("PASSENGER_")) {
      delete env[key];
    }
  }

  if (typeof env.NODE_OPTIONS === "string" && /passenger/i.test(env.NODE_OPTIONS)) {
    delete env.NODE_OPTIONS;
  }

  return env;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate an internal TCP port."));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function waitForPort(port, label, timeoutMs = STARTUP_TIMEOUT_MS) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.setTimeout(1_000);

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      const retry = () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`${label} did not become ready on port ${port} within ${timeoutMs}ms.`));
          return;
        }
        setTimeout(attempt, 200);
      };

      socket.once("error", retry);
      socket.once("timeout", retry);
    };

    attempt();
  });
}

function startChild(name, script, cwd, env) {
  const child = spawn(process.execPath, [script], {
    cwd,
    env: cleanChildEnv(env),
    stdio: "inherit",
  });

  children.set(name, child);

  child.once("error", (error) => {
    if (stopping) return;
    fatal(`${name} failed to start`, { message: error.message });
    void shutdown("child-error", 1);
  });

  child.once("exit", (code, signal) => {
    children.delete(name);
    if (stopping) return;
    fatal(`${name} exited unexpectedly`, { code, signal });
    void shutdown("child-exit", 1);
  });

  return child;
}

function forwardedHeaders(req) {
  const headers = { ...req.headers };
  const remoteAddress = req.socket.remoteAddress;
  const existingForwardedFor = req.headers["x-forwarded-for"];

  if (remoteAddress) {
    headers["x-forwarded-for"] = existingForwardedFor
      ? `${existingForwardedFor}, ${remoteAddress}`
      : remoteAddress;
  }

  headers["x-forwarded-host"] = req.headers.host || "sickosoul.shop";
  headers["x-forwarded-proto"] =
    req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http");

  return headers;
}

function proxyRequest(req, res, port, serviceName) {
  const upstream = http.request(
    {
      host: "127.0.0.1",
      port,
      method: req.method,
      path: req.url,
      headers: forwardedHeaders(req),
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.setTimeout(60_000, () => {
    upstream.destroy(new Error(`${serviceName} upstream timed out.`));
  });

  upstream.once("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    const isApi = serviceName === "backend";
    res.statusCode = 503;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", isApi ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
    res.end(
      isApi
        ? JSON.stringify({ error: { code: "UPSTREAM_UNAVAILABLE", message: "API temporarily unavailable." } })
        : "Application temporarily unavailable.",
    );
  });

  req.pipe(upstream);
}

async function shutdown(reason, exitCode = 0) {
  if (stopping) return;
  stopping = true;
  log("shutdown requested", { reason });

  if (gateway) {
    await new Promise((resolve) => gateway.close(() => resolve()));
  }

  for (const child of children.values()) {
    if (!child.killed) child.kill("SIGTERM");
  }

  const forceTimer = setTimeout(() => {
    for (const child of children.values()) {
      if (!child.killed) child.kill("SIGKILL");
    }
    process.exit(exitCode);
  }, 5_000);
  forceTimer.unref();

  await Promise.all(
    [...children.values()].map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve();
            return;
          }
          child.once("exit", () => resolve());
        }),
    ),
  );

  process.exit(exitCode);
}

async function bootstrap() {
  assertFile(NEXT_SERVER, "Next standalone server");
  assertFile(BACKEND_SERVER, "Backend server");

  const backendPort = await getFreePort();
  startChild("backend", BACKEND_SERVER, BACKEND_ROOT, {
    NODE_ENV: "production",
    PORT: String(backendPort),
    API_PREFIX,
    FRONTEND_ORIGIN: "https://sickosoul.shop",
  });
  await waitForPort(backendPort, "backend");
  log("backend ready", { port: backendPort });

  const nextPort = await getFreePort();
  startChild("frontend", NEXT_SERVER, FRONTEND_RELEASE, {
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(nextPort),
    NEXT_PUBLIC_API_BASE_URL: API_PREFIX,
    SICKO_INTERNAL_API_BASE_URL: `http://127.0.0.1:${backendPort}${API_PREFIX}`,
  });
  await waitForPort(nextPort, "frontend");
  log("frontend ready", { port: nextPort });

  gateway = http.createServer((req, res) => {
    const pathname = new URL(req.url || "/", "http://sicko.local").pathname;

    if (pathname === "/__sicko_gateway_health") {
      res.statusCode = 200;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ status: "ok", frontend: true, backend: true }));
      return;
    }

    const isApi = pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);
    proxyRequest(req, res, isApi ? backendPort : nextPort, isApi ? "backend" : "frontend");
  });

  gateway.on("clientError", (_error, socket) => {
    if (socket.writable) {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    }
  });

  gateway.listen(PUBLIC_PORT, () => {
    log("same-origin gateway started", {
      publicPort: PUBLIC_PORT,
      apiPrefix: API_PREFIX,
      frontendPort: nextPort,
      backendPort,
    });
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  fatal("uncaught exception", { message: error.message, stack: error.stack });
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  fatal("unhandled rejection", { reason: String(reason) });
  void shutdown("unhandledRejection", 1);
});

bootstrap().catch((error) => {
  fatal("gateway bootstrap failed", { message: error.message, stack: error.stack });
  void shutdown("bootstrap-failure", 1);
});
