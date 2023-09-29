const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { useQueue } = require("discord-player");
const { printError, logInfo } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Wyświetla kolejkę")
    .setDMPermission(false),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guild.id);
    if (!queue)
      return printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const response = await interaction.editReply(generatePage(queue));

    const collector = await response.createMessageComponentCollector({
      time: 35000,
    });

    collector.on("collect", async (interaction) => {
      const currentPage =
        parseInt(interaction.message.embeds[0].footer.text.split(" ")[1]) - 1;
      if (interaction.customId == "previous") {
        await interaction.update(generatePage(queue, currentPage - 1));
      } else if (interaction.customId == "next") {
        await interaction.update(generatePage(queue, currentPage + 1));
      } else {
        logInfo(
          "queueCollector",
          new Error(`Unknown customId ${interaction.customId}`)
        );
      }
    });

    collector.on("end", async (collected, reason) => {
      response.delete().catch((err) => {
        logInfo("printQueue", err);
      });
    });
  },
};
function generatePage(queue, page = 0) {
  const howManyonPage = 15;
  const totalPages = Math.ceil(queue.getSize() / howManyonPage) || 1;

  const previousBtn = new ButtonBuilder()
    .setCustomId("previous")
    .setLabel("Poprzednia strona")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page == 0);

  const nextBtn = new ButtonBuilder()
    .setCustomId("next")
    .setLabel("Następna strona")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page == totalPages - 1);

  const queueString = queue.tracks
    .toArray()
    .slice(page * howManyonPage, (page + 1) * howManyonPage)
    .map((song, i) => {
      return `*${page * howManyonPage + i + 1}*. **${song.title}** [${
        song.duration
      }]`;
    });

  const currentSong = queue.currentTrack;

  const embed = new EmbedBuilder()
    .setTitle(
      "Kolejka" +
        (queue.repeatMode == 1 ? " (:repeat_one: powtarzanie utworu)" : "") +
        (queue.repeatMode == 2 ? " (:repeat: powtarzanie całej kolejki)" : "") +
        (queue.node.isPaused() ? "\n(:pause_button: wstrzymane)" : "")
    )
    .setDescription(
      "**Teraz gra:**\n" +
        (currentSong
          ? `[**${currentSong.title}**](${currentSong.url}) [${currentSong.duration}]\n` +
            `Autor **${currentSong.author}** \n *dodane przez <@${currentSong.requestedBy.id}>*`
          : "Nic nie gra") +
        `\n\n**Kolejka:**\n${queueString.join("\n")}`
    )
    .setThumbnail(currentSong.thumbnail)
    .setFooter({ text: `Strona ${page + 1} z ${totalPages}` })
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(previousBtn, nextBtn);

  return { embeds: [embed], components: [row] };
}
