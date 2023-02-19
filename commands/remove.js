const { SlashCommandBuilder } = require("discord.js");

const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Usuwa utwór z kolejki")
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
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const songNumber = interaction.options.getInteger("numer");
    if (songNumber > queue.tracks.length)
      return printError(
        interaction,
        "Nie ma takiego utworu w kolejce! Upewnij się, że podałeś poprawny numer."
      );

    const currentSong = queue.tracks[songNumber - 1];

    await queue.remove(songNumber - 1);

    await printTrackInfo(
      interaction,
      currentSong,
      ":wastebasket: Usunięto!",
      `Usunąłem **${currentSong.title}** z kolejki!`
    );
  },
};
