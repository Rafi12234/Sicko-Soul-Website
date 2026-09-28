const http = require("http");
const next = require("next");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";

const app = next({
  dev: false,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, hostname, () => {
      console.log(`Sicko Soul frontend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Sicko Soul frontend:", error);
    process.exit(1);
  });