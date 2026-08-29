const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerStart,
  async execute(queue, track) {
    const currentTrack = track || queue.currentTrack;
    if (currentTrack) {
      utils.logInfo(
        `[${queue.guild.name}] Playing ${currentTrack.title} ` +
          `(${currentTrack.url}) [${currentTrack.duration}]`
      );
    }
    if (queue.metadata) {
      queue.metadata.trackStartTime = Date.now();
      queue.metadata.skippedByUser = false;
      queue.metadata?.unsubscribeLyrics?.();
      queue.metadata.lastLyricsLines = null;
    }
    await utils.sendStatus(queue, true);
  }
};
