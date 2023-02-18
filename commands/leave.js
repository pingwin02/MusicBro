const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Wyrzuca bota z kanału głosowego oraz czyści kolejkę"),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce! Użyj `/play` aby coś odtworzyć.")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });
    await queue.destroy();
    await interaction
      .editReply("Do usłyszenia! :heart: <:szymon:854508552026062879>")
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
