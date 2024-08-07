const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { sendStatus, printError } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Wyświetla informacje o aktualnie granym utworze")
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    sendStatus(queue);
    await interaction.deleteReply();
  }
};
