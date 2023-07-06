const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printInfo } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Wyrzuca bota z kanału głosowego oraz czyści kolejkę")
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Nie ma mnie na kanale! Użyj `/play` aby mnie dodać i puścić utwór."
      );
    queue.delete();
    printInfo(
      interaction,
      ":wave: Do usłyszenia!",
      "Wyrzuciłeś mnie z kanału głosowego.\n Użyj `/play` aby mnie dodać i puścić utwór"
    );
  },
};
