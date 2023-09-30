const fs = require("fs");
const { Events } = require("discord.js");
const { logInfo, timedDelete } = require("../../functions");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (message.content === "!!clear") {
        fs.writeFile("logs/log.log", "", (err) => {
          if (err) {
            logInfo("!!clear command", err);
          }
        });
        logInfo(`Log file cleared by @${message.author.username}`);
        const channel = message.client.channels.cache.get(
          message.channelId.toString()
        );
        const toDelete = [];
        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach((msg) => {
          if (msg.author.id === message.client.user.id) toDelete.push(msg.id);
        });
        if (toDelete.length === 0) {
          const msg1 = await message.reply({
            content: "Nie znaleziono żadnych wiadomości do usunięcia",
          });
          timedDelete(msg1);
        } else {
          toDelete.forEach((msg) => {
            timedDelete(channel.messages.cache.get(msg), 0);
          });

          const msg2 = await message.reply({
            content: `Usunąłem **${toDelete.length}** moich wiadomości`,
          });
          timedDelete(msg2);
        }
        if (message.guild) timedDelete(message);
      }
    } catch (err) {
      logInfo(`${message.content} message`, err);
    }
  },
};
