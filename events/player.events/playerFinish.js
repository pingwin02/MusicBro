const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerFinish,
  async execute(queue, track) {
    const finishedTrack = track || queue.currentTrack;
    const playedDurationMs = queue.metadata?.trackStartTime
      ? Date.now() - queue.metadata.trackStartTime
      : null;
    const isAbruptFinish =
      playedDurationMs !== null &&
      playedDurationMs < 2000 &&
      !queue.metadata?.skippedByUser &&
      finishedTrack &&
      finishedTrack.duration !== "0:00";

    utils.logInfo(`[${queue.guild.name}] Player finished playing`);

    if (isAbruptFinish) {
      const trackTitle = finishedTrack?.title
        ? `**${finishedTrack.title}**`
        : utils.t("errors.track_fallback");
      utils.printError(
        queue.metadata?.textChannel,
        utils.t("errors.player_error", { track: trackTitle })
      );
    }

    utils.sendLoadingStatus(queue);
  }
};
