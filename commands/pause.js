const { SlashCommandBuilder } = require("discord.js");

const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Wstrzymuje odtwarzanie utworu")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    if (queue.node.isPaused()) {
      return printError(
        interaction,
        "Utwór został już wstrzymany!\nUżyj `/resume` aby wznowić odtwarzanie."
      );
    }
    queue.node.pause();

    const currentSong = queue.currentTrack;

    await printTrackInfo(
      interaction,
      currentSong,
      ":pause_button: Pauza!",
      `Wstrzymałem odtwarzanie **${currentSong.title}**\nUżyj \`/resume\` aby wznowić odtwarzanie.`
    );
  },
};
