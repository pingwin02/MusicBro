const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfoDate } = require("../functions");

module.exports = {
  name: GuildQueueEvent.error,
  type: "player.events",
  async execute(queue, error) {
    logInfoDate("error event", err);
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`<:sus:833956789421735976> Coś się zepsuło!`)
            .setDescription(`Spróbuj ponownie później!\n\`${error}\``)
            .setColor("Red"),
        ],
      })
      .catch((err) => {
        logInfoDate("error event", err);
      });
  },
};
