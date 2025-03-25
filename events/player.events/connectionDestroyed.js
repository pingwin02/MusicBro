const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.ConnectionDestroyed,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Connection destroyed`);
  }
};
