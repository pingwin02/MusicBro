const { GuildQueueEvent } = require("discord-player");
const { logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.emptyQueue,
  type: "player",
  async execute(queue) {
    logInfoDate(`Queue is empty in ${queue.guild.name}`, 2);
  },
};
