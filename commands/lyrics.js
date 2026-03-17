const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Wyświetl tekst wskazanego utworu lub aktualnie granego")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Tytuł utworu do wyszukania tekstu")
        .setRequired(false)
    ),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);
    const query = interaction.options.getString("query");

    if (!queue && !query) {
      return utils.printError(
        interaction,
        "Kolejka jest pusta! Użyj `/play`, aby dodać utwory."
      );
    }

    let result;
    try {
      if (query) {
        result = await utils.handleLyrics({ searchString: query });
      } else {
        result = await utils.handleLyrics({ queue });
      }
    } catch (err) {
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas pobierania tekstu.",
        err
      );
    }

    if (!result?.lyrics) {
      return utils.printError(
        interaction,
        "Nie znaleziono tekstu dla podanego utworu."
      );
    }

    const trimmedLyrics = result.lyrics.substring(0, 4093);
    const { embed, row } = utils.buildEmbedWithButton({
      title: `Tekst: ${result.author} - ${result.title}`,
      description:
        trimmedLyrics.length === 4093 ? `${trimmedLyrics}...` : trimmedLyrics,
      color: "Yellow",
      buttonStyle: ButtonStyle.Danger
    });
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};
