const { SlashCommandBuilder } = require("discord.js");

const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Wstrzymuje odtwarzanie utworu")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    if (queue.connection.paused) {
      return printError(
        interaction,
        "Utwór został już wstrzymany!\nUżyj `/resume` aby wznowić odtwarzanie."
      );
    }
    queue.setPaused(true);

    const currentSong = queue.current;

    await printTrackInfo(
      interaction,
      currentSong,
      ":pause_button: Pauza!",
      `Wstrzymałem odtwarzanie **${currentSong.title}**\nUżyj \`/resume\` aby wznowić odtwarzanie.`
    );
  },
};
