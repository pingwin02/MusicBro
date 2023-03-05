const { SlashCommandBuilder } = require("discord.js");

const { printError, printInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ustawia głośność odtwarzacza")
    .addIntegerOption((option) =>
      option
        .setName("wartość")
        .setDescription("Wartość głośności")
        .setMinValue(1)
        .setMaxValue(1000)
        .setRequired(true)
    )
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    await queue.node.setVolume(interaction.options.getInteger("wartość"));
    await printInfo(
      interaction,
      `:loud_sound: Głośność zmieniona!`,
      `Ustawiono głośność na **${interaction.options.getInteger("wartość")}**`
    );
  },
};
