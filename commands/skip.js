const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Pomija aktualnie odtwarzany utwór"),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    await queue.skip();
    const currentSong = queue.current;
    let newSong = queue.tracks[0];
    if (!newSong) {
      newSong = {
        title: "Brak kolejnych utworów. Wychodzę z kanału głosowego.",
        thumbnail: "https://demofree.sirv.com/nope-not-here.jpg",
      };
    }

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Utwór **${currentSong.title}** pominięty! <:szymon:854508552026062879>`)
            .setDescription(`Teraz odtwarzam **${newSong.title}**`)
            .setThumbnail(newSong.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
