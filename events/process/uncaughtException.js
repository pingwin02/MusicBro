const utils = require("../../utils");

module.exports = {
  name: "uncaughtException",
  async execute(error) {
    utils.logInfo("uncaughtException", error);
    await utils.exitWithDelay(1);
  }
};
