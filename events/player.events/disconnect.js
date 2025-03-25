const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.Disconnect,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Disconnected`);
  }
};
