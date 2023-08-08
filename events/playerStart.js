const { GuildQueueEvent } = require("discord-player");
const { printNowPlaying, logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.playerStart,
  type: "player",
  async execute(queue) {
    logInfoDate(
      `Track ${queue.currentTrack.title} (${queue.currentTrack.url}) started playing at ${queue.guild.name}`,
      2
    );
    printNowPlaying(queue.metadata, queue);
  },
};
