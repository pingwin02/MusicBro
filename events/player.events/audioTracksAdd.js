const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.audioTracksAdd,
  async execute(queue, track) {
    utils.logInfo(
      `[${queue.guild.name}] Added playlist ${track[0].playlist.description} ` +
        `(${track[0].playlist.url}) [${track.length} tracks]`
    );
    queue.metadata.page = queue.metadata.page || 0;
    utils.sendStatus(queue);
  }
};
