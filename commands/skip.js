const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pomija aktualnie odtwarzany utwór")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const currentSong = queue.currentTrack;
    const repeatMode = queue.repeatMode;
    await queue.node.skip();
    queue.setRepeatMode(0);
    if (queue.node.isPaused()) queue.node.resume();

    await printTrackInfo(
      interaction,
      currentSong,
      `:arrow_forward: Pominięto **${currentSong.title}**!`,
      repeatMode
        ? " :x: Pętla została wyłączona! Użyj `/loop` aby ją włączyć."
        : " "
    );
  },
};
