const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.emptyChannel,
  async execute(queue) {
    utils.logInfo(
      `[${queue.guild.name}] Empty channel #${queue.metadata.textChannel.name}`
    );
  }
};
