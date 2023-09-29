const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { sendStatus, printError } = require("../functions");

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
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    queue.node.setVolume(interaction.options.getInteger("value"));
    sendStatus(queue);
    await interaction.deleteReply();
  },
};
