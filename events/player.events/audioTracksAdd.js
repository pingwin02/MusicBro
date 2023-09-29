const { GuildQueueEvent } = require("discord-player");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.audioTracksAdd,
  async execute(queue, track) {
    logInfo(
      `[${queue.guild.name}] Added playlist ${track[0].playlist.description} (${track[0].playlist.url}) [${track.length} tracks]`
    );
  },
};
