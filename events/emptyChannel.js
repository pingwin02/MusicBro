const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfoDate, sendError, INFO_TIMEOUT } = require("../functions");

module.exports = {
  name: GuildQueueEvent.emptyChannel,
  type: "player",
  async execute(queue) {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "<:jakiedy1:801039061540012052> Nie ma już nikogo, więc wychodzę z kanału głosowego!"
            )
            .setColor("Red"),
        ],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              logInfoDate(`Deleting emptyChannel message: ${err.message}`, 1);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logInfoDate(`emptyChannel event: ${err.message}`, 1);
      });
  },
};
