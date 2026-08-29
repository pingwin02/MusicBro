const { useQueue } = require("discord-player");
const { ButtonStyle, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription(utils.t("commands.lyrics.description"))
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription(utils.t("commands.lyrics.options.query"))
        .setRequired(false)
    ),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);
    const query = interaction.options.getString("query");

    if (!queue && !query) {
      return utils.printError(interaction, utils.t("errors.queue_empty"));
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
        utils.t("commands.lyrics.error"),
        err
      );
    }

    if (!result?.lyrics) {
      return utils.printError(
        interaction,
        utils.t("commands.lyrics.not_found")
      );
    }

    const trimmedLyrics = result.lyrics.substring(0, 4093);
    const { embed, row } = utils.buildEmbedWithButton({
      title: utils.t("commands.lyrics.title", {
        author: result.author,
        title: result.title
      }),
      description:
        trimmedLyrics.length === 4093 ? `${trimmedLyrics}...` : trimmedLyrics,
      color: "Yellow",
      buttonStyle: ButtonStyle.Danger
    });
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};
