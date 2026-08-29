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
    .setDescription(utils.t("commands.import.description"))
    .addStringOption((option) =>
      option
        .setName("data")
        .setDescription(utils.t("commands.import.options.data"))
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
        utils.t("commands.import.empty_data")
      );
    }

    const player = useMainPlayer();
    const queue = utils.getOrCreateQueue(player, interaction);
    if (!queue) return;

    const trackWord =
      urls.length === 1
        ? utils.t("commands.import.track_single")
        : utils.t("commands.import.track_plural");

    const progressEmbed = new EmbedBuilder()
      .setTitle(utils.t("commands.import.title"))
      .setColor("Blue")
      .setDescription(
        utils.t("commands.import.starting", {
          count: urls.length,
          trackWord
        })
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
          utils.t("commands.import.progress", {
            current: i + 1,
            total: urls.length
          })
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
          utils.t("commands.import.failed_all", {
            failedUrls: utils.formatFailedUrls(failedUrls)
          })
        );
      }

      if (!queue.connection) await queue.connect(voiceChannel);

      await utils.startQueuePlayback(queue, interaction);

      if (failedUrls.length > 0) {
        const targetChannel =
          interaction.channel || queue.metadata?.textChannel;
        await utils.printError(
          targetChannel,
          utils.t("commands.import.failed_some", {
            failedUrls: utils.formatFailedUrls(failedUrls)
          })
        );
      }
    } catch (err) {
      utils.cleanupEmptyQueue(queue);
      utils.logInfo("Import processing error", err);
      return utils.printError(interaction, utils.t("commands.import.error"));
    } finally {
      if (queue?.tasksQueue) queue.tasksQueue.release();
    }
  }
};
