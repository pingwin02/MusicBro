const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.audioTrackAdd,
  async execute(queue, track) {
    utils.logInfo(`[${queue.guild.name}] Added ${track.title} (${track.url})`);
    queue.metadata.page = queue.metadata.page || 0;
    utils.sendStatus(queue);
  }
};
