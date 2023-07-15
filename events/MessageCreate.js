const fs = require("fs");
const { Events } = require("discord.js");
const { logInfoDate } = require("../functions");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.content === "!!clear") {
      fs.writeFile("logs/log.log", "", (err) => {
        if (err) {
          console.error("Error clearing log file:", err);
        }
      });
      logInfoDate(`Log file cleared by ${message.author.username}`, 2);

      const channel = message.client.channels.cache.get(
        message.channelId.toString()
      );

      const toDelete = [];

      channel.messages.fetch({ limit: 100 }).then((messages) => {
        messages.forEach((element) => {
          if (element.author.id === message.client.user.id)
            toDelete.push(element.id);
        });
        if (toDelete.length === 0) {
          message
            .reply({
              content: `Nie znaleziono żadnych wiadomości do usunięcia`,
              ephemeral: true,
            })
            .then((msg) => {
              setTimeout(
                () =>
                  msg.delete().catch((err) => {
                    logInfoDate(
                      `Deleting "no message found" message: ${err}`,
                      1
                    );
                  }),
                3000
              );
            });
        } else {
          message.client.channels.fetch(message.channelId).then((chl) => {
            toDelete.forEach((msgid) => {
              chl.messages.delete(msgid);
            });

            message
              .reply({
                content: `Usunąłem **${toDelete.length}** moich wiadomości`,
                ephemeral: true,
              })
              .then((msg) => {
                setTimeout(
                  () =>
                    msg.delete().catch((err) => {
                      logInfoDate(
                        `Deleting "number of deleted" message: ${err}`,
                        1
                      );
                    }),
                  3000
                );
              });
          });
        }
        if (message.guild)
          setTimeout(
            () =>
              message.delete().catch((err) => {
                logInfoDate(`Deleting "!!clear" message: ${err}`, 1);
              }),
            4000
          );
      });
    }
  },
};
