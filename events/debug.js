const { GuildQueueEvent } = require("discord-player");
const { logDebug } = require("../functions");

module.exports = {
  name: GuildQueueEvent.debug,
  type: "player",
  async execute(queue, message) {
    //logDebug(message); // Uncomment this line to log debug messages from discord-player
  },
};
