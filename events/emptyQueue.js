const { GuildQueueEvent } = require("discord-player");
const { logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.emptyQueue,
  type: "player.events",
  async execute(queue) {
    logInfoDate(`Queue is empty at ${queue.guild.name}`);
  },
};
