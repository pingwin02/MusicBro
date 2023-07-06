const { Events } = require("discord.js");
const { logCommandUse, sendError } = require("../functions");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.content === "!!clear") {
      logCommandUse(message);

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
                    sendError(
                      "Kasowanie wiadomości brak wiadomości do usunięcia",
                      err,
                      message
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
                      sendError(
                        "Kasowanie wiadomości o usuniętych wiadomościach",
                        err,
                        message
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
                sendError(
                  "Kasowanie wiadomości !!clear użytkownika",
                  err,
                  message
                );
              }),
            4000
          );
      });
    }
  },
};
