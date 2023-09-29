const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../functions");

module.exports = {
  name: GuildQueueEvent.emptyQueue,
  type: "player.events",
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Empty queue`);
  },
};
