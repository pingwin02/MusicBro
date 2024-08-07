const { SlashCommandBuilder } = require("discord.js");
const { useQueue, QueueRepeatMode } = require("discord-player");
const { printError, sendStatus } = require("../functions");

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
    queue.node.skipTo(songNumber - 1);
    queue.setRepeatMode(QueueRepeatMode.OFF);
    if (queue.node.isPaused()) queue.node.resume();
    sendStatus(queue);
    await interaction.deleteReply();
  }
};
