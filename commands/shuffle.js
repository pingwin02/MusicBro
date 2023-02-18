const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Losuje kolejność utworów w kolejce")
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
    await queue.shuffle();
    await interaction
      .editReply(
        "Kolejność utworów w kolejce została zmieszana! Użyj `/queue` aby ją zobaczyć. :musical_note:"
      )
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
