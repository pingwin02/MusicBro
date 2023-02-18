const { SlashCommandBuilder } = require("discord.js");

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
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce! Użyj `/play` aby coś odtworzyć.")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "track":
        queue.setRepeatMode(1);
        await interaction
          .editReply("Pętla utworu została włączona! :repeat:")
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });
        break;
      case "queue":
        queue.setRepeatMode(2);
        await interaction
          .editReply("Pętla kolejki została włączona! :repeat:")
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });
        break;
      case "off":
        queue.setRepeatMode(0);
        await interaction
          .editReply("Pętla została wyłączona! :x:")
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });
        break;
    }
  },
};
