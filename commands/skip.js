const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pomija aktualnie odtwarzany utwór")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue || queue.tracks.length === 0)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce! Użyj `/play` aby coś odtworzyć.")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    await queue.skip();
    queue.setRepeatMode(0);

    let newSong = queue.tracks[0];

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Teraz odtwarzam **${newSong.title}** :musical_note:`)
            .setDescription(
              "Pętla została wyłączona! :x: Użyj `/loop` aby ją włączyć."
            )
            .setThumbnail(newSong.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
