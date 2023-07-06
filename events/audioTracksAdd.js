const { GuildQueueEvent } = require("discord-player");
const { logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.audioTracksAdd,
  type: "player",
  async execute(queue, track) {
    logInfoDate(
      `Playlist ${track[0].playlist.description} (${track[0].playlist.url}) [${track.length} tracks] was added in ${queue.guild.name}`,
      2
    );
  },
};