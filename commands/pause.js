const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, printTrackInfo } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Wstrzymuje/wznawia odtwarzanie utworu")
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );
    const paused = queue.node.isPaused();

    queue.node.setPaused(!paused);

    const currentSong = queue.currentTrack;

    printTrackInfo(
      interaction,
      currentSong,
      !paused ? ":pause_button: Pauza!" : ":arrow_forward: Wznowiono!",
      (!paused ? "Wstrzymałem" : "Wznowiłem") +
        ` odtwarzanie **${currentSong.title}**\nUżyj \`/pause\` aby ` +
        (!paused ? "wznowić" : "zatrzymać")
    );
  },
};
