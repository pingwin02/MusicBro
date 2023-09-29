const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../functions");

module.exports = {
  name: GuildQueueEvent.connectionDestroyed,
  type: "player.events",
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Connection destroyed`);
  },
};
