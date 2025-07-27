const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { useQueue, QueueRepeatMode } = require("discord-player");
const utils = require("../utils");

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
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);
    if (!queue)
      return utils.printError(
        interaction,
        "Kolejka jest pusta! Użyj `/play`, aby dodać utwory."
      );
    const songNumber = interaction.options.getInteger("number");
    if (songNumber > queue.getSize())
      return utils.printError(
        interaction,
        "Nie ma takiego utworu w kolejce! " +
          "Upewnij się, że podałeś poprawny numer."
      );
    queue.node.skipTo(songNumber - 1);
    queue.setRepeatMode(QueueRepeatMode.OFF);
    if (queue.node.isPaused()) queue.node.resume();
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
