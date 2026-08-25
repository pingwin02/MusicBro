const { GuildQueueEvent, QueueRepeatMode } = require("discord-player");
const utils = require("../../utils");

const MAX_RETRY_ATTEMPTS = 5;

module.exports = {
  name: GuildQueueEvent.PlayerError,
  async execute(queue, error, track) {
    if (track) {
      track.errorAttempts = (track.errorAttempts || 0) + 1;
    }
    const attempt = track?.errorAttempts || 1;
    utils.logInfo(
      `[${queue.guild.name}] playerError event ` +
        `(attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`,
      error
    );

    if (track && attempt < MAX_RETRY_ATTEMPTS) {
      queue.options.noEmitInsert = true;
      queue.insertTrack(track, 0);
      queue.options.noEmitInsert = false;
      return;
    }

    const trackTitle = track?.title ? `**${track.title}**` : "utworu";
    utils.printError(
      queue.metadata?.textChannel,
      `Wystąpił błąd podczas odtwarzania ${trackTitle}! ` +
        "Utwór został pominięty.",
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
