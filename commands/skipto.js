const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Przeskakuje do wybranego utworu w kolejce")
    .addIntegerOption((option) =>
      option
        .setName("numer")
        .setDescription("Numer utworu w kolejce")
        .setMinValue(1)
        .setRequired(true)
    )
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

    const songNumber = interaction.options.getInteger("numer");
    if (songNumber > queue.tracks.length)
      return await interaction
        .editReply(":x: Nie ma takiego utworu w kolejce!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    await queue.skipTo(songNumber - 1);

    const currentSong = queue.tracks[songNumber - 1];

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `Przeskoczyłem do **${currentSong.title}**! :musical_note:`
            )
            .setThumbnail(currentSong.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
