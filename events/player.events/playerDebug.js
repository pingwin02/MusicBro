const { GuildQueueEvent } = require("discord-player");
const { logDebug } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.debug,
  async execute(queue, message) {
    // Emitted when the player queue sends debug info
    // Useful for seeing what state the current queue is at
    if (process.argv.includes("debug")) logDebug(message);
  }
};
