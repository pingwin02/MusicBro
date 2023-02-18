const { SlashCommandBuilder } = require("discord.js");

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
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    await queue.setVolume(interaction.options.getInteger("wartość"));

    await interaction
      .editReply(
        `:white_check_mark: Ustawiono głośność na **${interaction.options.getInteger(
          "wartość"
        )}**`
      )
      .then((msg) => {
        setTimeout(() => msg.delete(), 5000);
      });
  },
};
