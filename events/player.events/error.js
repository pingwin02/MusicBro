const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.error,
  async execute(queue, error) {
    logInfo("error event", error);
    queue.metadata.textChannel
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle("<:sus:833956789421735976> Coś się zepsuło!")
            .setDescription(`Spróbuj ponownie później!\n\`${error}\``)
            .setColor("Red"),
        ],
      })
      .catch((err) => {
        logInfo("error event", error);
      });
  },
};
