const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.connectionDestroyed,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Connection destroyed`);
    if (queue.metadata.statusMessage) {
      queue.metadata.statusMessage.delete().catch((error) => {
        logInfo("Deleting status message", error);
      });
    }
  },
};
