const { useQueue } = require("discord-player");
const {
  AttachmentBuilder,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder
} = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("export")
    .setDescription(utils.t("commands.export.description"))
    .setContexts(InteractionContextType.Guild),

  run: async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const queue = useQueue(interaction.guildId || interaction.guild?.id);

    const tracks = [];
    if (queue?.currentTrack) {
      tracks.push(queue.currentTrack);
    }
    if (queue?.tracks) {
      tracks.push(...queue.tracks.toArray());
    }

    if (tracks.length === 0) {
      return utils.printError(
        interaction,
        utils.t("commands.export.empty"),
        null,
        true
      );
    }

    const urls = tracks
      .map((t) => utils.toShortTrackUrl(t.url))
      .filter(Boolean);
    const exportString = urls.join("\n");

    if (!exportString) {
      return utils.printError(
        interaction,
        utils.t("commands.export.no_urls"),
        null,
        true
      );
    }

    const trackWord =
      tracks.length === 1
        ? utils.t("commands.export.exported_single")
        : utils.t("commands.export.exported_plural");

    const embed = new EmbedBuilder()
      .setTitle(utils.t("commands.export.title"))
      .setColor("Blue");

    if (exportString.length <= 4000) {
      const header = utils.t("commands.export.exported_title", {
        count: tracks.length,
        trackWord
      });
      embed.setDescription(`${header}\n\`\`\`\n${exportString}\n\`\`\``);
      await interaction.editReply({ embeds: [embed] });
    } else {
      const header = utils.t("commands.export.exported_title", {
        count: tracks.length,
        trackWord
      });
      const note = utils.t("commands.export.file_attached");
      embed.setDescription(`${header}\n${note}`);
      const attachment = new AttachmentBuilder(
        Buffer.from(exportString, "utf-8"),
        { name: "queue.txt" }
      );
      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      });
    }
  }
};
