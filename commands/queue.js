const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Wyświetla kolejkę")
    .addNumberOption((option) =>
      option.setName("strona").setDescription("Strona kolejki").setMinValue(1)
    )
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue || !queue.playing)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce! Zapodaj coś! :musical_note:")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    const howManyonPage = 15;
    const totalPages = Math.ceil(queue.tracks.length / howManyonPage) || 1;
    const page = (interaction.options.getNumber("strona") || 1) - 1;

    if (page > totalPages - 1)
      return await interaction
        .editReply(`:x: Nie ma takiej strony! (${totalPages} stron)`)
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });
    const queueString = queue.tracks
      .slice(page * howManyonPage, (page + 1 )* howManyonPage)
      .map((song, i) => {
        return `*${page * howManyonPage + i + 1}*. **${song.title}** [${song.duration}]`;
      });

    const currentSong = queue.current;

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `**Teraz gra:**\n` +
                (currentSong
                  ? `[**${currentSong.title}**](${currentSong.url}) [${currentSong.duration}]\n Kanał **${currentSong.author}** \n *dodane przez <@${currentSong.requestedBy.id}>*`
                  : "Nic nie gra") +
                `\n\n**Kolejka:**\n${queueString.join("\n")}`
            )
            .setFooter({ text: `Strona ${page + 1} z ${totalPages}` })
            .setThumbnail(currentSong.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 60000);
      });
  },
};
