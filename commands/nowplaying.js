const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printNowPlaying } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Wyświetla informacje o aktualnie granym utworze")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.node.isPlaying())
      return printError(
        interaction,
        "Nic nie jest teraz odtwarzane! Użyj `/play` aby coś odtworzyć."
      );

    printNowPlaying(interaction, queue, true);
  },
};
