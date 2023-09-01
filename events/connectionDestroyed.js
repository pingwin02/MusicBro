const { GuildQueueEvent } = require("discord-player");
const { logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.connectionDestroyed,
  type: "player.events",
  async execute(queue) {
    logInfoDate(`Connection destroyed in ${queue.guild.name}`, 2);
  },
};
