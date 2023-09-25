const { logInfoDate } = require("../functions");

module.exports = {
  name: "uncaughtException",
  type: "process",
  async execute(err) {
    logInfoDate(`Uncaught Exception`, err);
    process.exit(1);
  },
};
