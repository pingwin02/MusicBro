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
    .setDescription("Eksportuje aktualną kolejkę utworów")
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
        "Kolejka jest pusta! Nie ma nic do wyeksportowania.",
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
        "Nie znaleziono linków w aktualnej kolejce.",
        null,
        true
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("📦 Eksport kolejki")
      .setColor("Blue");

    if (exportString.length <= 4000) {
      embed.setDescription(
        `Wyeksportowano **${tracks.length}** ` +
          `${tracks.length === 1 ? "utwór" : "utworów"}:\n` +
          "```\n" +
          exportString +
          "\n```"
      );
      await interaction.editReply({ embeds: [embed] });
    } else {
      embed.setDescription(
        `Wyeksportowano **${tracks.length}** ` +
          `${tracks.length === 1 ? "utwór" : "utworów"}.\n` +
          "Lista jest zbyt długa na wiadomość, " +
          "została dołączona w pliku poniżej."
      );
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
