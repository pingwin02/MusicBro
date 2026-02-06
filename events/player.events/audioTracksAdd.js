const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.AudioTracksAdd,
  async execute(queue, track) {
    utils.logInfo(
      `[${queue.guild.name}] Added playlist ${track[0].title} ` +
        `(${track[0].url}) [${track.length} tracks]`
    );
    queue.metadata.page = queue.metadata.page || 0;
    utils.sendStatus(queue);
  }
};
