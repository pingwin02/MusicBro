const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerResume,
  async execute(queue) {
    utils.logInfo(`[${queue.guild.name}] Player resumed`);
    utils.sendStatus(queue);
  }
};
