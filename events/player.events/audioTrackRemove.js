const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.AudioTrackRemove,
  async execute(queue, track) {
    utils.logInfo(
      `[${queue.guild.name}] Removed ${track.title} ` +
        `(${track.url}) [${track.duration}]`
    );
    utils.sendStatus(queue);
  }
};
