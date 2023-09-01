const { GuildQueueEvent } = require("discord-player");
const { logDebug } = require("../functions");

module.exports = {
  name: GuildQueueEvent.debug,
  type: "player.events",
  async execute(queue, message) {
    // Emitted when the player queue sends debug info
    // Useful for seeing what state the current queue is at
    // logDebug(message); // Uncomment this line to log debug messages from discord-player
  },
};
