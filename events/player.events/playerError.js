const { GuildQueueEvent } = require("discord-player");
const { EmbedBuilder } = require("discord.js");
const { logInfo } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.playerError,
  async execute(queue, error) {
    logInfo("playerError event", error);
    queue.metadata.textChannel
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle("<:sus:833956789421735976> Coś się zepsuło!")
            .setDescription(`Spróbuj ponownie później!\n\`${error}\``)
            .setColor("Red"),
        ],
      })
      .catch((error) => {
        logInfo("playerError event", error);
      });
  },
};
