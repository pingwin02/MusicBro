const { Events } = require("discord.js");
const utils = require("../../utils");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    utils.logInfo(`Logged in as ${client.user.tag}!`);
  }
};
