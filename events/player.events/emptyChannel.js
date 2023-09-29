const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfo, INFO_TIMEOUT } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.emptyChannel,
  async execute(queue) {
    logInfo(`[${queue.guild.name}] Empty channel #${queue.metadata.name}`);
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
              logInfo("Deleting emptyChannel message", err);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logInfo("emptyChannel event", err);
      });
  },
};
