const { Events } = require("discord.js");
const utils = require("../../utils");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    utils.logInfo(`Logged in as ${client.user.tag}!`);

    client.activeEasterEgg = null;

    utils.checkEasterEggs(client);

    const now = new Date();
    const msToNextMinute =
      60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    setTimeout(() => {
      utils.checkEasterEggs(client);

      setInterval(() => {
        utils.checkEasterEggs(client);
      }, 60 * 1000);
    }, msToNextMinute);
  }
};
