const { GuildQueueEvent } = require("discord-player");
const { logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.audioTrackAdd,
  type: "player",
  async execute(queue, track) {
    logInfoDate(
      `Track ${track.title} (${track.url}) was added at ${queue.guild.name}`,
      2
    );
  },
};
