const { useMainPlayer } = require("discord-player");
const {
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder
} = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("import")
    .setDescription("Importuje utwory do kolejki z wyeksportowanych linków")
    .addStringOption((option) =>
      option
        .setName("data")
        .setDescription("Ciąg znaków z linkami oddzielonymi spacjami")
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild),

  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const voiceChannel = utils.validateVoiceChannel(client, interaction);
    if (!voiceChannel) return;

    const data = interaction.options.getString("data");
    const urls = data
      .split(/[\s;]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      return utils.printError(
        interaction,
        "Nie podano żadnych prawidłowych linków do zaimportowania!"
      );
    }

    const player = useMainPlayer();
    const queue = utils.getOrCreateQueue(player, interaction);
    if (!queue) return;

    const progressEmbed = new EmbedBuilder()
      .setTitle("📥 Importowanie kolejki")
      .setColor("Blue")
      .setDescription(
        `Rozpoczynanie importu **${urls.length}** ` +
          `${urls.length === 1 ? "utworu" : "utworów"}...`
      );

    await interaction.editReply({ embeds: [progressEmbed] });

    try {
      const entry = queue.tasksQueue.acquire();
      await entry.getTask();

      let importedCount = 0;
      const failedUrls = [];

      for (let i = 0; i < urls.length; i++) {
        const rawUrl = urls[i];
        const url = utils.cleanTrackUrl(rawUrl);

        progressEmbed.setDescription(
          `Przetwarzanie **${i + 1}/${urls.length}**...\n` +
            `Zaimportowano pomyślnie: **${importedCount}**`
        );
        await interaction
          .editReply({ embeds: [progressEmbed] })
          .catch(() => {});

        let added = false;
        try {
          const result = await player.search(url, {
            requestedBy: interaction.user
          });

          if (result && result.tracks.length > 0) {
            for (const track of result.tracks) {
              if (utils.isPlayableTrack(track)) {
                queue.addTrack(track);
                importedCount++;
                added = true;
              }
            }
          }
        } catch (searchErr) {
          utils.logInfo(
            `[${interaction.guild.name}] Import search error for ${url}`,
            searchErr
          );
        }

        if (!added) {
          failedUrls.push(rawUrl);
        }
      }

      if (importedCount === 0) {
        utils.cleanupEmptyQueue(queue);
        return utils.printError(
          interaction,
          "Nie udało się zaimportować utworów z podanych linków:\n" +
            utils.formatFailedUrls(failedUrls)
        );
      }

      if (!queue.connection) await queue.connect(voiceChannel);

      await utils.startQueuePlayback(queue, interaction);

      if (failedUrls.length > 0) {
        const targetChannel =
          interaction.channel || queue.metadata?.textChannel;
        await utils.printError(
          targetChannel,
          "Nie udało się zaimportować niektórych linków:\n" +
            utils.formatFailedUrls(failedUrls)
        );
      }
    } catch (err) {
      utils.cleanupEmptyQueue(queue);
      utils.logInfo("Import processing error", err);
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas przetwarzania importu."
      );
    } finally {
      if (queue?.tasksQueue) queue.tasksQueue.release();
    }
  }
};
