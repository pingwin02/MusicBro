const { logInfoDate } = require("../functions");

module.exports = {
  name: "uncaughtException",
  type: "process",
  async execute(err) {
    logInfoDate(`Uncaught Exception: ${err}`, 1);
    process.exit(1);
  },
};
