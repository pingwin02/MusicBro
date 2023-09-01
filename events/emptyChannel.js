const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfoDate, INFO_TIMEOUT } = require("../functions");

module.exports = {
  name: GuildQueueEvent.emptyChannel,
  type: "player.events",
  async execute(queue) {
    logInfoDate(
      `Channel #${queue.metadata.name} is empty at ${queue.guild.name}`,
      2
    );
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
              logInfoDate(`Deleting emptyChannel message: ${err}`, 1);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logInfoDate(`emptyChannel event: ${err}`, 1);
      });
  },
};
