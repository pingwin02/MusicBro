const { SlashCommandBuilder } = require("discord.js");

const { printError, printNowPlaying } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jakatomelodia")
    .setDescription("Wyświetla informacje o aktualnie granym utworze")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue || !queue.playing)
      return printError(
        interaction,
        "Nic nie jest teraz odtwarzane! Użyj `/play` aby coś odtworzyć."
      );

    const song = queue.current;

    printNowPlaying(interaction, queue, true);
  },
};
