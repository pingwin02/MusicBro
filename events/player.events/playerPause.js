const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerPause,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Player paused`);
  }
};
