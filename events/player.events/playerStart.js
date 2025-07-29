const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerStart,
  async execute(queue) {
    utils.logInfo(
      `[${queue.guild.name}] Playing ${queue.currentTrack.title} ` +
        `(${queue.currentTrack.url}) [${queue.currentTrack.duration}]`
    );
    queue.metadata?.unsubscribeLyrics?.();
    utils.sendStatus(queue, true);
  }
};
