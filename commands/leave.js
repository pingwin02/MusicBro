const { SlashCommandBuilder } = require("discord.js");

const { printError, printInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Wyrzuca bota z kanału głosowego oraz czyści kolejkę")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.nodes.get(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Nie ma mnie na kanale! Użyj `/play` aby mnie dodać i puścić utwór."
      );
    await queue.delete();
    await printInfo(
      interaction,
      ":wave: Do usłyszenia!",
      "Wyrzuciłeś mnie z kanału głosowego. <:szymon:854508552026062879>\n Użyj `/play` aby mnie dodać i puścić utwór."
    );
  },
};
