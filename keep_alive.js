const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer(function (req, res) {
  res.setHeader("Refresh", "60");
  if (req.url === "/log") {
    const filePath = path.join(__dirname, "logs/log.log");

    fs.readFile(filePath, function (err, data) {
      if (err) {
        res.statusCode = 500;
        res.end("Błąd odczytu pliku log.log");
      } else {
        res.setHeader("Content-Type", "text/plain");
        res.end(data);
      }
    });
  } else {
    res.write("Jestem aktywny!");
    res.end();
  }
});

server.listen(8080);
