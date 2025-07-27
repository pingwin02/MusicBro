const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Czyści kolejkę utworów")
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);
    if (!queue || queue.getSize() === 0)
      return utils.printError(
        interaction,
        "Kolejka jest pusta! Użyj `/play`, aby dodać utwory."
      );
    queue.clear();
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
