const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.QueueDelete,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Queue deleted`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (queue.metadata.statusMessage)
        await queue.metadata.statusMessage.delete();
    } catch (error) {
      utils.logInfo("Unable to delete status message", error.message);
    }
  }
};
