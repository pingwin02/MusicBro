const { SlashCommandBuilder } = require("discord.js");

const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Przeskakuje do wybranego utworu w kolejce")
    .addIntegerOption((option) =>
      option
        .setName("numer")
        .setDescription("Numer utworu w kolejce")
        .setMinValue(1)
        .setRequired(true)
    )
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const songNumber = interaction.options.getInteger("numer");
    if (songNumber > queue.getSize())
      return printError(
        interaction,
        "Nie ma takiego utworu w kolejce! Upewnij się, że podałeś poprawny numer."
      );

    const currentSong = queue.currentTrack;
    const repeatMode = queue.repeatMode;
    await queue.node.skipTo(songNumber - 1);
    queue.setRepeatMode(0);
    if (queue.node.isPaused()) queue.node.resume();

    await printTrackInfo(
      interaction,
      currentSong,
      `:arrow_forward: Pominięto **${currentSong.title}**!`,
      repeatMode
        ? " :x: Pętla została wyłączona! Użyj `/loop` aby ją włączyć."
        : " "
    );
  },
};
