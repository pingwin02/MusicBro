const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { QueryType } = require("discord-player");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kolejka")
    .setDescription("Wyświetla kolejkę")
    .addNumberOption((option) =>
      option.setName("strona").setDescription("Strona kolejki").setMinValue(1)
    ),
  run: async ({ client, interaction }) => {
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue || !queue.playing)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 3000);
        });

    const totalPages = Math.ceil(queue.tracks.length / 10) || 1;
    const page = (interaction.options.getNumber("strona") || 1) - 1;

    if (page > totalPages - 1)
      return await interaction
        .editReply(`:x: Nie ma takiej strony! (${totalPages} stron)`)
        .then((msg) => {
          setTimeout(() => msg.delete(), 3000);
        });
    const queueString = queue.tracks
      .slice(page * 10, page * 10 + 10)
      .map((song, i) => {
        return `*${page * 10 + i + 1}*. **${song.title}** [${
          song.duration
        }]`;
      });

    const currentSong = queue.current;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `**Teraz gra:**\n` +
              (currentSong
                ? `[**${currentSong.title}**](${currentSong.url}) [${currentSong.duration}] <@${currentSong.requestedBy.id}>`
                : "Nic nie gra") +
              `\n\n**Kolejka:**\n${queueString.join("\n")}`
          )
          .setFooter({ text: `Strona ${page + 1} z ${totalPages}` })
          .setThumbnail(currentSong.thumbnail),
      ],
    }).then((msg) => {
        setTimeout(() => msg.delete(), 30000);
      });
  },
};
