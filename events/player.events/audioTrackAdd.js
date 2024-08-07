const { GuildQueueEvent } = require("discord-player");
const { logInfo, sendStatus } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.audioTrackAdd,
  async execute(queue, track) {
    logInfo(`[${queue.guild.name}] Added ${track.title} (${track.url})`);
    queue.metadata.page = Number.MAX_SAFE_INTEGER;
    sendStatus(queue);
  }
};
