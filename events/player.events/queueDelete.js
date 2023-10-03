const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.queueDelete,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Queue deleted`);
    try {
      await queue.metadata.statusMessage.delete();
    } catch (error) {
      logInfo(`[${queue.guild.name}] Unable to delete status message`);
    }
  },
};
