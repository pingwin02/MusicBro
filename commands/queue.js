const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { printError, sendError, QUEUE_TIMEOUT } = require("../index.js");

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
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const howManyonPage = 15;
    const totalPages = Math.ceil(queue.tracks.length / howManyonPage) || 1;
    const page = (interaction.options.getNumber("strona") || 1) - 1;

    if (page > totalPages - 1)
      return printError(
        interaction,
        `Nie ma takiej strony! (jest łącznie ${totalPages} stron)`
      );
    const queueString = queue.tracks
      .slice(page * howManyonPage, (page + 1) * howManyonPage)
      .map((song, i) => {
        return `*${page * howManyonPage + i + 1}*. **${song.title}** [${
          song.duration
        }]`;
      });

    const currentSong = queue.current;

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `Kolejka` +
                (queue.repeatMode == 1
                  ? " (:repeat_one: powtarzanie utworu)"
                  : "") +
                (queue.repeatMode == 2
                  ? " (:repeat: powtarzanie całej kolejki)"
                  : "") +
                (queue.connection.paused ? "\n(:pause_button: wstrzymane)" : "")
            )
            .setDescription(
              `**Teraz gra:**\n` +
                (currentSong
                  ? `[**${currentSong.title}**](${currentSong.url}) [${currentSong.duration}]\n Kanał **${currentSong.author}** \n *dodane przez <@${currentSong.requestedBy.id}>*`
                  : "Nic nie gra") +
                `\n\n**Kolejka:**\n${queueString.join("\n")}`
            )
            .setThumbnail(currentSong.thumbnail)
            .setFooter({ text: `Strona ${page + 1} z ${totalPages}` })
            .setColor("Blue"),
        ],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              sendError("Kasowanie wiadomości", err, interaction);
            }),
          QUEUE_TIMEOUT
        );
      });
  },
};
