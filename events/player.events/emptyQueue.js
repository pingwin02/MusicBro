const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.emptyQueue,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Empty queue`);
  }
};
