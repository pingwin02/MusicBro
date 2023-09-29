const { logInfo } = require("../../functions");

module.exports = {
  name: "uncaughtException",
  async execute(err) {
    logInfo("uncaughtException", err);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  },
};
