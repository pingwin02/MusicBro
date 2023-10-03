const { GuildQueueEvent } = require("discord-player");
const { sendStatus, logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.playerStart,
  async execute(queue) {
    logInfo(
      `[${queue.guild.name}] Playing ${queue.currentTrack.title} (${queue.currentTrack.url})`
    );
    await sendStatus(queue);
  },
};
