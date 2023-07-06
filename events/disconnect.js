const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfoDate, sendError, INFO_TIMEOUT } = require("../functions");

module.exports = {
  name: GuildQueueEvent.disconnect,
  type: "player",
  async execute(queue) {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "<:jakiedy1:801039061540012052> Rozłączyłem się! Do usłyszenia :wave:"
            )
            .setColor("Red"),
        ],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              logInfoDate(`Deleting disconnect message: ${err.message}`, 1);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logInfoDate(`disconnect event: ${err.message}`, 1);
      });
  },
};
