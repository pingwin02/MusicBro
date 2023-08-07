const http = require("http");
const fs = require("fs");
const path = require("path");

const generateHTML = (title, content, styles = "") => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <link rel="icon" type="image/png" href="bot_logo.png">
    <link rel="stylesheet" href="styles.css">
    <script src="script.js" defer></script>
    <style>${styles}</style>
  </head>
  <body>
    <div class="container">
      <div class="bot-logo"></div>
      <div class="rectangle">${content}</div>
    </div>
  </body>
  </html>
`;

const mimeTypes = {
  ".png": "image/png",
  ".css": "text/css",
  ".js": "text/javascript",
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Refresh", "60");

  try {
    if (req.url === "/log") {
      const filePath = path.join(__dirname, "../logs/log.log");
      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) throw err;
        else {
          const fileContent = data
            .toString()
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");

          const htmlContent = generateHTML("Logi - MusicBro", fileContent);
          res.end(htmlContent);
        }
      });
    } else if (mimeTypes[path.extname(req.url)]) {
      const filePath = path.join(__dirname, req.url);
      res.setHeader("Content-Type", mimeTypes[path.extname(req.url)]);

      fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        else res.end(data);
      });
    } else {
      const mainContent = `Witaj! Jestem aktywny!
      <br><br>
      Strona odświeża się automatycznie co minutę w celu podtrzymania aktywności bota.
      <br><br>
      Miłego korzystania! ~pingwiniasty
      `;
      const styles =
        ".rectangle { width: 30%; font-size: 24px; font-weight: bold; text-align: center; white-space: normal; min-width: 300px; }";
      const htmlContent = generateHTML(
        "Jestem aktywny! - MusicBro",
        mainContent,
        styles
      );
      res.end(htmlContent);
    }
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(8080);
