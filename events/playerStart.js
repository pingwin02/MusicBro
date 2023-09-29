const { GuildQueueEvent } = require("discord-player");
const { printNowPlaying, logInfo } = require("../functions");

module.exports = {
  name: GuildQueueEvent.playerStart,
  type: "player.events",
  async execute(queue) {
    logInfo(
      `[${queue.guild.name}] Playing ${queue.currentTrack.title} (${queue.currentTrack.url})`
    );
    printNowPlaying(queue.metadata, queue);
  },
};
