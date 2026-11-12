const {
  ErrorCodes,
  GuildQueueEvent,
  QueueRepeatMode
} = require("discord-player");
const utils = require("../../utils");

const NON_RETRYABLE_STATUSES = [
  "LOGIN_REQUIRED",
  "UNPLAYABLE",
  "CONTENT_CHECK_REQUIRED"
];

module.exports = {
  name: GuildQueueEvent.PlayerError,
  async execute(queue, error, track) {
    if (track) {
      track.errorAttempts = (track.errorAttempts || 0) + 1;
    }
    const attempt = track?.errorAttempts || 1;
    const isPermanentFailure =
      track?.unplayableStatus &&
      NON_RETRYABLE_STATUSES.includes(track.unplayableStatus);

    const trackInfo = track?.title ? ` for ${track.title} (${track.url})` : "";
    if (isPermanentFailure) {
      const reasonStr = track.unplayableReason || "Unknown reason";
      utils.logInfo(
        `[${queue.guild.name}] Unplayable track skipped${trackInfo} ` +
          `(${track.unplayableStatus}: ${reasonStr})`
      );
    } else {
      utils.logInfo(
        `[${queue.guild.name}] playerError event${trackInfo} ` +
          `(attempt ${attempt}/${utils.MAX_RETRY_ATTEMPTS})`,
        error
      );
    }

    if (track && attempt < utils.MAX_RETRY_ATTEMPTS && !isPermanentFailure) {
      queue.options.noEmitInsert = true;
      queue.insertTrack(track, 0);
      queue.options.noEmitInsert = false;
      return;
    }

    const trackTitle = track?.title
      ? `**${track.title}**`
      : utils.t("errors.track_fallback");

    const errorMsg = isPermanentFailure
      ? utils.t("commands.play.unplayable", {
        reason: track.unplayableReason || utils.t("status.no_reason"),
        status: track.unplayableStatus,
        title: track.title,
        url: track.url
      })
      : utils.t("errors.player_error", { track: trackTitle });

    await utils.printError(
      queue.metadata?.textChannel,
      errorMsg,
      isPermanentFailure ? null : error
    );

    if (
      queue.repeatMode === QueueRepeatMode.QUEUE &&
      track &&
      !isPermanentFailure
    ) {
      track.errorAttempts = 0;
      queue.addTrack(track);
    } else if (queue.repeatMode === QueueRepeatMode.TRACK) {
      queue.setRepeatMode(QueueRepeatMode.OFF);
    }

    if (!queue.deleted && queue.tracks.size === 0 && !queue.dispatcher) {
      try {
        queue.delete();
      } catch (err) {
        if (err.code !== ErrorCodes.ERR_NO_GUILD_QUEUE) {
          throw err;
        }
      }
    }
  }
};
