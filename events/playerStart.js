const { GuildQueueEvent } = require("discord-player");
const { printNowPlaying } = require("../functions");

module.exports = {
  name: GuildQueueEvent.playerStart,
  type: "player",
  async execute(queue) {
    printNowPlaying(queue.metadata, queue, false);
  },
};
