const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Wyświetla informacje o aktualnie granym utworze")
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);
    if (!queue)
      return utils.printError(
        interaction,
        "Kolejka jest pusta! Użyj `/play`, aby dodać utwory."
      );
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
