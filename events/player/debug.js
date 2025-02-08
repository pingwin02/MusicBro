const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.debug,
  async execute(message) {
    // Emitted when the player sends debug info
    // Useful for seeing what dependencies, extractors, etc are loaded
    if (process.argv.includes("debug")) utils.logDebug(message);
  }
};
