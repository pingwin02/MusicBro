const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.Debug,
  async execute(message) {
    if (process.argv.includes("debug")) utils.logDebug(message);
  }
};
