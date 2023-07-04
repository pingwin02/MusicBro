const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Losuje kolejność utworów w kolejce")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    await queue.tracks.shuffle();
    await printInfo(
      interaction,
      ":twisted_rightwards_arrows: Losowo!",
      "Kolejność utworów w kolejce została zmieszana! Użyj `/queue` aby ją zobaczyć."
    );
  },
};
