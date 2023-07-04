const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Przeskakuje do wybranego utworu w kolejce")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Numer utworu w kolejce")
        .setMinValue(1)
        .setRequired(true)
    )
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const songNumber = interaction.options.getInteger("number");
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
