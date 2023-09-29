const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, sendStatus } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Usuwa utwór z kolejki")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Numer utworu w kolejce")
        .setMinValue(1)
        .setRequired(true)
    )
    .setDMPermission(false),
  run: async ({ interaction }) => {
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
    queue.node.remove(songNumber - 1);
    sendStatus(queue);
    await interaction.deleteReply();
  },
};
