const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.VolumeChange,
  async execute(queue, oldVolume, newVolume) {
    utils.logInfo(
      `[${queue.guild.name}] Volume changed: ${oldVolume} -> ${newVolume}`
    );
    utils.sendStatus(queue);
  }
};
