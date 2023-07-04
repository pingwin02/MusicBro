const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printInfo } = require("../index.js");

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
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    await queue.node.setVolume(interaction.options.getInteger("value"));
    await printInfo(
      interaction,
      `:loud_sound: Głośność zmieniona!`,
      `Ustawiono głośność na **${interaction.options.getInteger("value")}**`
    );
  },
};
