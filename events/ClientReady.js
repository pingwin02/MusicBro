const { Events, ActivityType } = require("discord.js");
const { logInfoDate } = require("../functions");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logInfoDate(`Logged in as ${client.user.tag}!`, 2);
    client.user.setPresence({
      activities: [{ name: "/play", type: ActivityType.Listening }],
      status: "online",
    });
  },
};
