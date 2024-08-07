const { GuildQueueEvent } = require("discord-player");
const { logDebug } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.debug,
  async execute(message) {
    // Emitted when the player sends debug info
    // Useful for seeing what dependencies, extractors, etc are loaded
    if (process.argv.includes("debug")) logDebug(message);
  }
};
