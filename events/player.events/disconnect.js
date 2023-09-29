const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.disconnect,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Disconnected`);
  },
};
