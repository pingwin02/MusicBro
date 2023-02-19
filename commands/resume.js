const { SlashCommandBuilder } = require("discord.js");

const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Wznawia odtwarzanie utworu")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    if (!queue.connection.paused) {
      return printError(
        interaction,
        "Aktualnie odtwarzacz gra!\nUżyj `/pause` aby zatrzymać odtwarzanie."
      );
    }
    queue.setPaused(false);

    const currentSong = queue.current;

    await printTrackInfo(
      interaction,
      currentSong,
      ":arrow_forward: Odtwórz!",
      `Wznawiam odtwarzanie **${currentSong.title}**`
    );
  },
};
