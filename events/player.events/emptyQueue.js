const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.emptyQueue,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Empty queue`);
  },
};
