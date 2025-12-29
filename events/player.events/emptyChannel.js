const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.EmptyChannel,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Empty channel`);
  }
};
