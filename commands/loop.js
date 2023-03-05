const { SlashCommandBuilder } = require("discord.js");

const { printError, printInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Zarządza pętlą")
    .addSubcommand((subcommand) =>
      subcommand.setName("track").setDescription("Włącza pętlę utworu")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("queue").setDescription("Włącza pętlę kolejki")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("off").setDescription("Wyłącza pętlę")
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

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "track":
        queue.setRepeatMode(1);
        await printInfo(
          interaction,
          ":repeat_one: Pętla!",
          "Pętla utworu została włączona!"
        );
        break;
      case "queue":
        queue.setRepeatMode(2);
        await printInfo(
          interaction,
          ":repeat: Pętla!",
          "Pętla kolejki została włączona!"
        );
        break;
      case "off":
        queue.setRepeatMode(0);
        await printInfo(
          interaction,
          ":x: Pętla wyłączona!",
          "Pętla została wyłączona!"
        );
        break;
    }
  },
};
