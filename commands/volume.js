const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ustawia głośność odtwarzacza")
    .addIntegerOption((option) =>
      option
        .setName("value")
        .setDescription("Wartość głośności")
        .setMinValue(1)
        .setMaxValue(1000)
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
    queue.node.setVolume(interaction.options.getInteger("value"));
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
