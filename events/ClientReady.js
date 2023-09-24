const { Events } = require("discord.js");
const { logInfoDate } = require("../functions");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logInfoDate(`Logged in as ${client.user.tag}!`, 2);
  },
};
