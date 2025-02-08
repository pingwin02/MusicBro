const utils = require("../../utils");

module.exports = {
  name: "uncaughtException",
  async execute(error) {
    utils.logInfo("uncaughtException", error);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
};
