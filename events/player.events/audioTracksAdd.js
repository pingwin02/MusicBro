const { GuildQueueEvent } = require("discord-player");
const { logInfo, sendStatus } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.audioTracksAdd,
  async execute(queue, track) {
    logInfo(
      `[${queue.guild.name}] Added playlist ${track[0].playlist.description} (${track[0].playlist.url}) [${track.length} tracks]`
    );
    queue.metadata.page = Number.MAX_SAFE_INTEGER;
    sendStatus(queue);
  }
};
