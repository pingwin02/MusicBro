const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.QueueCreate,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Queue created`);
  }
};
