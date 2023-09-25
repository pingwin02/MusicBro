const { logInfoDate } = require("../functions");

module.exports = {
  name: "uncaughtException",
  type: "process",
  async execute(err) {
    logInfoDate("uncaughtException", err);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  },
};
