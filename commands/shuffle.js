const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printInfo } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Losuje kolejność utworów w kolejce")
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    queue.tracks.shuffle();
    printInfo(
      interaction,
      ":twisted_rightwards_arrows: Losowo!",
      "Kolejność utworów w kolejce została zmieszana! Użyj `/queue` aby ją zobaczyć"
    );
  },
};
