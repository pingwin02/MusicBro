const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfoDate, INFO_TIMEOUT } = require("../functions");

module.exports = {
  name: GuildQueueEvent.disconnect,
  type: "player",
  async execute(queue) {
    logInfoDate(`Disconnected from ${queue.guild.name}`, 2);
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
              logInfoDate(`Deleting disconnect message: ${err}`, 1);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logInfoDate(`disconnect event: ${err}`, 1);
      });
  },
};
