const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.emptyChannel,
  async execute(queue) {
    logInfo(
      `[${queue.guild.name}] Empty channel #${queue.metadata.textChannel.name}`
    );
  },
};
