const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.queueDelete,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Queue deleted`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (queue.metadata.statusMessage)
        await queue.metadata.statusMessage.delete();
    } catch (error) {
      logInfo(`Unable to delete status message`, error.message);
    }
  },
};
