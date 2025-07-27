const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.AudioTracksRemove,
  async execute(queue, tracks) {
    utils.logInfo(
      `[${queue.guild.name}] Removed ${tracks.length} tracks from queue`
    );
    utils.sendStatus(queue);
  }
};
