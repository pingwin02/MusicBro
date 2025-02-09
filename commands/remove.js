const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Usuwa wybrany utwór z kolejki")
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
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    const songNumber = interaction.options.getInteger("number");
    if (songNumber > queue.getSize())
      return utils.printError(
        interaction,
        "Nie ma takiego utworu w kolejce! " +
          "Upewnij się, że podałeś poprawny numer."
      );
    queue.node.remove(songNumber - 1);
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
