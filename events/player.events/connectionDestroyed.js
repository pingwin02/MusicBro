const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.connectionDestroyed,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Connection destroyed`);
  }
};
