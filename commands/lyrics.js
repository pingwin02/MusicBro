const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Wyświetl tekst wskazanego utworu lub aktualnie granego.")
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
    const embed = new EmbedBuilder()
      .setTitle(`Tekst: ${result.author} - ${result.title}`)
      .setDescription(
        trimmedLyrics.length === 4093 ? `${trimmedLyrics}...` : trimmedLyrics
      )
      .setColor("Yellow");

    const closeBtn = new ButtonBuilder()
      .setCustomId("lyricsClose")
      .setLabel("Zamknij")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};
