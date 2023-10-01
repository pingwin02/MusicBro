const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.queueDelete,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Queue deleted`);
  },
};
