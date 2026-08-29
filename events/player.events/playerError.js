const { GuildQueueEvent, QueueRepeatMode } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerError,
  async execute(queue, error, track) {
    if (track) {
      track.errorAttempts = (track.errorAttempts || 0) + 1;
    }
    const attempt = track?.errorAttempts || 1;
    const trackInfo = track?.title ? ` for ${track.title} (${track.url})` : "";
    utils.logInfo(
      `[${queue.guild.name}] playerError event${trackInfo} ` +
        `(attempt ${attempt}/${utils.MAX_RETRY_ATTEMPTS})`,
      error
    );

    if (track && attempt < utils.MAX_RETRY_ATTEMPTS) {
      queue.options.noEmitInsert = true;
      queue.insertTrack(track, 0);
      queue.options.noEmitInsert = false;
      return;
    }

    const trackTitle = track?.title
      ? `**${track.title}**`
      : utils.t("errors.track_fallback");
    utils.printError(
      queue.metadata?.textChannel,
      utils.t("errors.player_error", { track: trackTitle }),
      error
    );

    if (queue.repeatMode === QueueRepeatMode.QUEUE && track) {
      track.errorAttempts = 0;
      queue.addTrack(track);
    } else if (queue.repeatMode === QueueRepeatMode.TRACK) {
      queue.setRepeatMode(QueueRepeatMode.OFF);
    }

    if (queue.tracks.size === 0 && !queue.dispatcher) {
      queue.delete();
    }
  }
};
