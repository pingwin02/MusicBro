const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, logInfoDate, QUEUE_TIMEOUT } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Wyświetla kolejkę")
    .addNumberOption((option) =>
      option.setName("page").setDescription("Strona kolejki").setMinValue(1)
    )
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const howManyonPage = 15;
    const totalPages = Math.ceil(queue.getSize() / howManyonPage) || 1;
    const page = (interaction.options.getNumber("page") || 1) - 1;

    if (page > totalPages - 1)
      return printError(
        interaction,
        `Nie ma takiej strony! (jest łącznie ${totalPages} stron).`
      );
    const queueString = queue.tracks
      .toArray()
      .slice(page * howManyonPage, (page + 1) * howManyonPage)
      .map((song, i) => {
        return `*${page * howManyonPage + i + 1}*. **${song.title}** [${
          song.duration
        }]`;
      });

    const currentSong = queue.currentTrack;

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
                (queue.node.isPaused() ? "\n(:pause_button: wstrzymane)" : "")
            )
            .setDescription(
              `**Teraz gra:**\n` +
                (currentSong
                  ? `[**${currentSong.title}**](${currentSong.url}) [${currentSong.duration}]\n Autor **${currentSong.author}** \n *dodane przez <@${currentSong.requestedBy.id}>*`
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
              logInfoDate(`printQueue: ${err}`, 1);
            }),
          QUEUE_TIMEOUT
        );
      });
  },
};
