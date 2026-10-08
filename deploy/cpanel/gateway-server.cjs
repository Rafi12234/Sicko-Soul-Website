"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const FRONTEND_ROOT = __dirname;
const FRONTEND_RELEASE = path.join(FRONTEND_ROOT, "release");

const BACKEND_ROOT =
  process.env.SICKO_BACKEND_ROOT ||
  "/home/sickosou/sicko-backend-prod";

// Versioned releases let the deployer replace a symlink, not live binaries.
// Before the first safe deployment, keep supporting the legacy backend.
const BACKEND_ACTIVE = path.join(BACKEND_ROOT, "current");
const BACKEND_RUNTIME = fs.existsSync(
  path.join(BACKEND_ACTIVE, "dist", "src", "server.js"),
) ? BACKEND_ACTIVE : BACKEND_ROOT;

const NEXT_SERVER = path.join(FRONTEND_RELEASE, "server.js");
const BACKEND_SERVER = path.join(BACKEND_RUNTIME, "dist", "src", "server.js");

// Computed once at PROCESS startup: the previous Passenger process cannot
// claim a new SHA merely because a deploy script updates marker files.
function activeRuntimeSource() {
  try {
    const frontSha = path.basename(fs.realpathSync(FRONTEND_RELEASE));
    const backSha = path.basename(fs.realpathSync(BACKEND_RUNTIME));
    return /^[a-f0-9]{40}$/.test(frontSha) && frontSha === backSha
      ? frontSha
      : null;
  } catch {
    return null;
  }
}
const RUNTIME_SOURCE = activeRuntimeSource();

const PUBLIC_PORT = Number(
  process.env.PORT || 3000,
);

const API_PREFIX = "/api/v1";
const STARTUP_TIMEOUT_MS = 30_000;

/*
 * Immediate deployment webhook configuration.
 *
 * The secret exists only on the server:
 * /home/sickosou/.sicko-deploy-secret
 *
 * GitHub Actions sends the same value in:
 * Authorization: Bearer <secret>
 */
const DEPLOY_SECRET_FILE =
  "/home/sickosou/.sicko-deploy-secret";

const DEPLOY_WATCHER =
  "/home/sickosou/repositories/Sicko-Soul-Website/sicko-release-watch.sh";

const DEPLOY_LOG =
  "/home/sickosou/logs/sicko-webhook-deploy.log";

const DEPLOY_MARKER =
  process.env.SICKO_DEPLOY_MARKER ||
  "/home/sickosou/.sicko-deployed-source";
const DEPLOY_STATUS_FILE =
  process.env.SICKO_DEPLOY_STATUS_FILE ||
  "/home/sickosou/.sicko-deploy-status.json";

function deploymentState() {
  try {
    const status = JSON.parse(fs.readFileSync(DEPLOY_STATUS_FILE, "utf8"));
    if (typeof status.source === "string" &&
        ["preparing", "activating", "active", "failed"].includes(status.state)) {
      return { source: status.source, state: status.state };
    }
  } catch { /* No deployment in progress. */ }
  return null;
}

let stopping = false;
let gateway;

const children = new Map();

/*
 * ------------------------------------------------------------
 * LOGGING
 * ------------------------------------------------------------
 */

function log(message, extra) {
  const payload = extra
    ? ` ${JSON.stringify(extra)}`
    : "";

  process.stdout.write(
    `[sicko-gateway] ${message}${payload}\n`,
  );
}

function fatal(message, extra) {
  const payload = extra
    ? ` ${JSON.stringify(extra)}`
    : "";

  process.stderr.write(
    `[sicko-gateway] FATAL ${message}${payload}\n`,
  );
}

/*
 * ------------------------------------------------------------
 * BASIC HELPERS
 * ------------------------------------------------------------
 */

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${label} not found: ${filePath}`,
    );
  }
}

function cleanChildEnv(extra = {}) {
  const env = {
    ...process.env,
    ...extra,
  };

  /*
   * Child processes must run as plain Node processes.
   * They must not inherit Passenger's process-loader state.
   */
  for (const key of Object.keys(env)) {
    if (
      key === "IN_PASSENGER" ||
      key.startsWith("PASSENGER_")
    ) {
      delete env[key];
    }
  }

  if (
    typeof env.NODE_OPTIONS === "string" &&
    /passenger/i.test(env.NODE_OPTIONS)
  ) {
    delete env.NODE_OPTIONS;
  }

  return env;
}

function sendJson(
  res,
  statusCode,
  payload,
) {
  res.statusCode = statusCode;

  res.setHeader(
    "Cache-Control",
    "no-store",
  );

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8",
  );

  res.end(
    JSON.stringify(payload),
  );
}

/*
 * ------------------------------------------------------------
 * DEPLOYMENT WEBHOOK
 * ------------------------------------------------------------
 */

function readDeploySecret() {
  return fs
    .readFileSync(
      DEPLOY_SECRET_FILE,
      "utf8",
    )
    .trim();
}

function deployAuthorized(req) {
  try {
    const secret = readDeploySecret();

    if (!secret) {
      return false;
    }

    const provided =
      String(
        req.headers.authorization || "",
      );

    const expected =
      `Bearer ${secret}`;

    const providedBuffer =
      Buffer.from(provided);

    const expectedBuffer =
      Buffer.from(expected);

    if (
      providedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer,
    );
  } catch (error) {
    fatal(
      "could not verify deploy authorization",
      {
        message: error.message,
      },
    );

    return false;
  }
}

function deployedSource() {
  try {
    if (
      !fs.existsSync(DEPLOY_MARKER)
    ) {
      return null;
    }

    return fs
      .readFileSync(
        DEPLOY_MARKER,
        "utf8",
      )
      .trim();
  } catch {
    return null;
  }
}

function startDeploymentWatcher() {
  /*
   * Important:
   * This process is intentionally detached.
   *
   * deploy-cpanel.sh eventually restarts this Passenger
   * gateway. The deployment process must survive that
   * restart.
   */

  assertFile(
    DEPLOY_WATCHER,
    "Deployment watcher",
  );

  fs.mkdirSync(
    path.dirname(DEPLOY_LOG),
    {
      recursive: true,
    },
  );

  const logFd = fs.openSync(
    DEPLOY_LOG,
    "a",
  );

  let child;

  try {
    child = spawn(
      "/bin/bash",
      [DEPLOY_WATCHER],
      {
        detached: true,

        stdio: [
          "ignore",
          logFd,
          logFd,
        ],

        env: cleanChildEnv({
          NODE_ENV: "production",
        }),
      },
    );
  } finally {
    fs.closeSync(logFd);
  }

  child.once(
    "error",
    (error) => {
      fatal(
        "deployment watcher failed to start",
        {
          message: error.message,
        },
      );
    },
  );

  /*
   * Do NOT put this child in the normal children map.
   *
   * It must continue running when Passenger restarts
   * the gateway during deployment.
   */
  child.unref();

  log(
    "deployment watcher started",
    {
      pid: child.pid,
    },
  );

  return child.pid;
}

/*
 * ------------------------------------------------------------
 * INTERNAL PORT MANAGEMENT
 * ------------------------------------------------------------
 */

function getFreePort() {
  return new Promise(
    (resolve, reject) => {
      const server =
        net.createServer();

      server.unref();

      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        () => {
          const address =
            server.address();

          if (
            !address ||
            typeof address === "string"
          ) {
            server.close();

            reject(
              new Error(
                "Could not allocate an internal TCP port.",
              ),
            );

            return;
          }

          const port =
            address.port;

          server.close(
            (error) => {
              if (error) {
                reject(error);
              } else {
                resolve(port);
              }
            },
          );
        },
      );
    },
  );
}

function waitForPort(
  port,
  label,
  timeoutMs = STARTUP_TIMEOUT_MS,
) {
  const startedAt = Date.now();

  return new Promise(
    (resolve, reject) => {
      const attempt = () => {
        const socket =
          net.createConnection({
            host: "127.0.0.1",
            port,
          });

        socket.setTimeout(1_000);

        socket.once(
          "connect",
          () => {
            socket.destroy();
            resolve();
          },
        );

        const retry = () => {
          socket.destroy();

          if (
            Date.now() -
              startedAt >=
            timeoutMs
          ) {
            reject(
              new Error(
                `${label} did not become ready on port ${port} within ${timeoutMs}ms.`,
              ),
            );

            return;
          }

          setTimeout(
            attempt,
            200,
          );
        };

        socket.once(
          "error",
          retry,
        );

        socket.once(
          "timeout",
          retry,
        );
      };

      attempt();
    },
  );
}

/*
 * ------------------------------------------------------------
 * CHILD SERVICES
 * ------------------------------------------------------------
 */

function startChild(
  name,
  script,
  cwd,
  env,
) {
  const child = spawn(
    process.execPath,
    [script],
    {
      cwd,

      env: cleanChildEnv(
        env,
      ),

      stdio: "inherit",
    },
  );

  children.set(
    name,
    child,
  );

  child.once(
    "error",
    (error) => {
      if (stopping) {
        return;
      }

      fatal(
        `${name} failed to start`,
        {
          message:
            error.message,
        },
      );

      void shutdown(
        "child-error",
        1,
      );
    },
  );

  child.once(
    "exit",
    (code, signal) => {
      children.delete(name);

      if (stopping) {
        return;
      }

      fatal(
        `${name} exited unexpectedly`,
        {
          code,
          signal,
        },
      );

      void shutdown(
        "child-exit",
        1,
      );
    },
  );

  return child;
}

/*
 * ------------------------------------------------------------
 * PROXY
 * ------------------------------------------------------------
 */

function forwardedHeaders(req) {
  const headers = {
    ...req.headers,
  };

  const remoteAddress =
    req.socket.remoteAddress;

  const existingForwardedFor =
    req.headers[
      "x-forwarded-for"
    ];

  if (remoteAddress) {
    headers[
      "x-forwarded-for"
    ] = existingForwardedFor
      ? `${existingForwardedFor}, ${remoteAddress}`
      : remoteAddress;
  }

  headers[
    "x-forwarded-host"
  ] =
    req.headers.host ||
    "sickosoul.shop";

  headers[
    "x-forwarded-proto"
  ] =
    req.headers[
      "x-forwarded-proto"
    ] ||
    (
      req.socket.encrypted
        ? "https"
        : "http"
    );

  return headers;
}

function proxyRequest(
  req,
  res,
  port,
  serviceName,
) {
  const upstream =
    http.request(
      {
        host: "127.0.0.1",

        port,

        method:
          req.method,

        path:
          req.url,

        headers:
          forwardedHeaders(
            req,
          ),
      },

      (upstreamRes) => {
        res.writeHead(
          upstreamRes.statusCode ||
            502,

          upstreamRes.headers,
        );

        upstreamRes.pipe(res);
      },
    );

  upstream.setTimeout(
    60_000,
    () => {
      upstream.destroy(
        new Error(
          `${serviceName} upstream timed out.`,
        ),
      );
    },
  );

  upstream.once(
    "error",
    (error) => {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }

      const isApi =
        serviceName ===
        "backend";

      res.statusCode = 503;

      res.setHeader(
        "Cache-Control",
        "no-store",
      );

      res.setHeader(
        "Content-Type",
        isApi
          ? "application/json; charset=utf-8"
          : "text/plain; charset=utf-8",
      );

      res.end(
        isApi
          ? JSON.stringify({
              error: {
                code:
                  "UPSTREAM_UNAVAILABLE",

                message:
                  "API temporarily unavailable.",
              },
            })
          : "Application temporarily unavailable.",
      );
    },
  );

  req.pipe(upstream);
}

/*
 * ------------------------------------------------------------
 * GRACEFUL SHUTDOWN
 * ------------------------------------------------------------
 */

async function shutdown(
  reason,
  exitCode = 0,
) {
  if (stopping) {
    return;
  }

  stopping = true;

  log(
    "shutdown requested",
    {
      reason,
    },
  );

  if (gateway) {
    await new Promise(
      (resolve) => {
        gateway.close(
          () => resolve(),
        );
      },
    );
  }

  for (
    const child
    of children.values()
  ) {
    if (!child.killed) {
      child.kill(
        "SIGTERM",
      );
    }
  }

  const forceTimer =
    setTimeout(
      () => {
        for (
          const child
          of children.values()
        ) {
          if (
            !child.killed
          ) {
            child.kill(
              "SIGKILL",
            );
          }
        }

        process.exit(
          exitCode,
        );
      },
      5_000,
    );

  forceTimer.unref();

  await Promise.all(
    [
      ...children.values(),
    ].map(
      (child) =>
        new Promise(
          (resolve) => {
            if (
              child.exitCode !==
                null ||
              child.signalCode !==
                null
            ) {
              resolve();
              return;
            }

            child.once(
              "exit",
              () => resolve(),
            );
          },
        ),
    ),
  );

  process.exit(
    exitCode,
  );
}

/*
 * ------------------------------------------------------------
 * BOOTSTRAP
 * ------------------------------------------------------------
 */

async function bootstrap() {
  assertFile(
    NEXT_SERVER,
    "Next standalone server",
  );

  assertFile(
    BACKEND_SERVER,
    "Backend server",
  );

  /*
   * Backend
   */

  const backendPort =
    await getFreePort();

  startChild(
    "backend",
    BACKEND_SERVER,
    BACKEND_RUNTIME,
    {
      NODE_ENV:
        "production",

      PORT:
        String(
          backendPort,
        ),

      API_PREFIX,

      FRONTEND_ORIGIN:
        "https://sickosoul.shop",
    },
  );

  await waitForPort(
    backendPort,
    "backend",
  );

  log(
    "backend ready",
    {
      port:
        backendPort,
    },
  );

  /*
   * Frontend
   */

  const nextPort =
    await getFreePort();

  startChild(
    "frontend",
    NEXT_SERVER,
    FRONTEND_RELEASE,
    {
      NODE_ENV:
        "production",

      HOSTNAME:
        "127.0.0.1",

      PORT:
        String(
          nextPort,
        ),

      NEXT_PUBLIC_API_BASE_URL:
        API_PREFIX,

      SICKO_INTERNAL_API_BASE_URL:
        `http://127.0.0.1:${backendPort}${API_PREFIX}`,
    },
  );

  await waitForPort(
    nextPort,
    "frontend",
  );

  log(
    "frontend ready",
    {
      port:
        nextPort,
    },
  );

  /*
   * Public gateway
   */

  gateway =
    http.createServer(
      (req, res) => {
        const pathname =
          new URL(
            req.url || "/",
            "http://sicko.local",
          ).pathname;

        /*
         * --------------------------------------------------
         * PRIVATE DEPLOYMENT WEBHOOK
         * --------------------------------------------------
         */

        if (
          pathname ===
          "/__sicko_deploy"
        ) {
          if (
            req.method !==
            "POST"
          ) {
            sendJson(
              res,
              405,
              {
                error:
                  "METHOD_NOT_ALLOWED",
              },
            );

            return;
          }

          if (
            !deployAuthorized(
              req,
            )
          ) {
            sendJson(
              res,
              401,
              {
                error:
                  "UNAUTHORIZED",
              },
            );

            return;
          }

          try {
            const pid =
              startDeploymentWatcher();

            sendJson(
              res,
              202,
              {
                status:
                  "accepted",

                pid,
              },
            );
          } catch (
            error
          ) {
            fatal(
              "deployment trigger failed",
              {
                message:
                  error.message,
              },
            );

            sendJson(
              res,
              500,
              {
                error:
                  "DEPLOY_TRIGGER_FAILED",
              },
            );
          }

          return;
        }

        /*
         * --------------------------------------------------
         * PRIVATE DEPLOYMENT STATUS
         * --------------------------------------------------
         */

        if (
          pathname ===
          "/__sicko_deploy_status"
        ) {
          if (
            req.method !==
            "GET"
          ) {
            sendJson(
              res,
              405,
              {
                error:
                  "METHOD_NOT_ALLOWED",
              },
            );

            return;
          }

          if (
            !deployAuthorized(
              req,
            )
          ) {
            sendJson(
              res,
              401,
              {
                error:
                  "UNAUTHORIZED",
              },
            );

            return;
          }

          sendJson(
            res,
            200,
            {
              status:
                "ok",

              deployedSource:
                deployedSource(),
              runtimeSource: RUNTIME_SOURCE,
              deployment: deploymentState(),
            },
          );

          return;
        }

        /*
         * --------------------------------------------------
         * PUBLIC GATEWAY HEALTH
         * --------------------------------------------------
         */

        if (
          pathname ===
          "/__sicko_gateway_health"
        ) {
          sendJson(
            res,
            200,
            {
              status:
                "ok",

              frontend:
                true,

              backend:
                true,
              runtimeSource: RUNTIME_SOURCE,
            },
          );

          return;
        }

        /*
         * --------------------------------------------------
         * NORMAL SITE / API TRAFFIC
         * --------------------------------------------------
         */

        const isApi =
          pathname ===
            API_PREFIX ||
          pathname.startsWith(
            `${API_PREFIX}/`,
          );

        proxyRequest(
          req,
          res,

          isApi
            ? backendPort
            : nextPort,

          isApi
            ? "backend"
            : "frontend",
        );
      },
    );

  gateway.on(
    "clientError",
    (
      _error,
      socket,
    ) => {
      if (
        socket.writable
      ) {
        socket.end(
          "HTTP/1.1 400 Bad Request\r\n" +
            "Connection: close\r\n" +
            "\r\n",
        );
      }
    },
  );

  gateway.listen(
    PUBLIC_PORT,
    () => {
      log(
        "same-origin gateway started",
        {
          publicPort:
            PUBLIC_PORT,

          apiPrefix:
            API_PREFIX,

          frontendPort:
            nextPort,

          backendPort:
            backendPort,
        },
      );
    },
  );
}

/*
 * ------------------------------------------------------------
 * PROCESS SIGNALS
 * ------------------------------------------------------------
 */

process.once(
  "SIGTERM",
  () =>
    void shutdown(
      "SIGTERM",
    ),
);

process.once(
  "SIGINT",
  () =>
    void shutdown(
      "SIGINT",
    ),
);

process.on(
  "uncaughtException",
  (error) => {
    fatal(
      "uncaught exception",
      {
        message:
          error.message,

        stack:
          error.stack,
      },
    );

    void shutdown(
      "uncaughtException",
      1,
    );
  },
);

process.on(
  "unhandledRejection",
  (reason) => {
    fatal(
      "unhandled rejection",
      {
        reason:
          String(reason),
      },
    );

    void shutdown(
      "unhandledRejection",
      1,
    );
  },
);

bootstrap().catch(
  (error) => {
    fatal(
      "gateway bootstrap failed",
      {
        message:
          error.message,

        stack:
          error.stack,
      },
    );

    void shutdown(
      "bootstrap-failure",
      1,
    );
  },
);