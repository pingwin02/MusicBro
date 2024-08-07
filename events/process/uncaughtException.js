const { logInfo } = require("../../functions");

module.exports = {
  name: "uncaughtException",
  async execute(error) {
    logInfo("uncaughtException", error);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
};
