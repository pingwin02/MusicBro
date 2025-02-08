const fs = require("fs");
const { inspect } = require("util");

/**
 * Logs information to the console and appends it to a log file.
 * @param {string} info - Information to log.
 * @param {Error} error - Error to log (optional)
 *
 * @returns {void}
 */
function logInfo(info, error = null) {
  const currentdate = new Date()
    .toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
    .replace(",", "");

  let logMessage = `[${currentdate}] - `;

  if (error) {
    logMessage += `[ERROR] ${info}: ${inspect(error)}`;
    console.error(logMessage);
  } else {
    logMessage += `[INFO] ${info}`;
    console.log(logMessage); // eslint-disable-line no-console
  }

  fs.appendFile(
    process.argv.includes("dev") ? "logs/dev.log" : "logs/log.log",
    `${logMessage}\n`,
    (err) => {
      if (err) {
        console.error("Error writing to log file:", err);
      }
    }
  );
}

/**
 * Logs debug information to the console and appends it to a debug file.
 * @param {string} info - Information to log.
 * @returns {void}
 */
function logDebug(info) {
  const currentdate = new Date()
    .toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw"
    })
    .replace(",", "");

  const logMessage = `[${currentdate}] - [DEBUG] ${info}`;

  console.debug(logMessage); // eslint-disable-line no-console

  fs.appendFile("logs/debug.log", `${logMessage}\n`, (err) => {
    if (err) {
      console.error("Error writing to debug file:", err);
    }
  });
}

module.exports = {
  logInfo,
  logDebug
};
