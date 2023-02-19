const { SlashCommandBuilder } = require("discord.js");

const { printError, printTrackInfo } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pomija aktualnie odtwarzany utwór")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const currentSong = queue.current;
    const repeatMode = queue.repeatMode;
    await queue.skip();
    queue.setRepeatMode(0);
    if (queue.connection.paused) queue.setPaused(false);

    await printTrackInfo(
      interaction,
      currentSong,
      `:arrow_forward: Pominięto **${currentSong.title}**!`,
      (repeatMode
        ? " :x: Pętla została wyłączona! Użyj `/loop` aby ją włączyć."
        : " ")
    );
  },
};
