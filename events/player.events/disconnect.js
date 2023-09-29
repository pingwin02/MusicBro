const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfo, INFO_TIMEOUT } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.disconnect,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Disconnected`);
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
              logInfo("Deleting disconnect message", err);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logInfo("disconnect event", err);
      });
  },
};
