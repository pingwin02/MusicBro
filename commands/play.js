const { useMainPlayer } = require("discord-player");
const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription(utils.t("commands.play.description"))
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription(utils.t("commands.play.options.query"))
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("mix")
        .setDescription(utils.t("commands.play.options.mix"))
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("next")
        .setDescription(utils.t("commands.play.options.next"))
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("force")
        .setDescription(utils.t("commands.play.options.force"))
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription(utils.t("commands.play.options.mode"))
        .setRequired(false)
        .addChoices(
          {
            name: utils.t("commands.play.choices.music"),
            value: "music"
          },
          {
            name: utils.t("commands.play.choices.general"),
            value: "general"
          }
        )
    )
    .setContexts(InteractionContextType.Guild),

  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const voiceChannel = utils.validateVoiceChannel(client, interaction);
    if (!voiceChannel) return;

    const mix = interaction.options.getBoolean("mix") || false;
    const next = interaction.options.getBoolean("next") || false;
    const force = interaction.options.getBoolean("force") || false;
    const mode = interaction.options.getString("mode") || "music";
    const searchPrefix = mode === "general" ? "ytvideo: " : "youtube: ";

    if (force && next) {
      return utils.printError(interaction, utils.t("commands.play.conflict"));
    }

    let query = interaction.options.getString("query");
    const isManualQuery = !query.match(/^https?:\/\//);

    if (!isManualQuery) {
      query = utils.cleanTrackUrl(query);
    }

    const player = useMainPlayer();
    const queue = utils.getOrCreateQueue(player, interaction);
    if (!queue) return;

    try {
      let result;

      if (isManualQuery) {
        const initialResult = await player.search(searchPrefix + query, {
          ignoreCache: true,
          requestedBy: interaction.user,
          requestOptions: { mode }
        });

        if (!initialResult || initialResult.tracks.length === 0) {
          utils.logInfo(`[${interaction.guild.name}] No results for ${query}`);
          if (!queue.currentTrack) queue.delete();
          return utils.printError(interaction, utils.t("errors.no_results"));
        }

        const resolvedUrl = initialResult.tracks[0]?.url;

        if (!resolvedUrl) {
          utils.logInfo(
            `[${interaction.guild.name}] Could not resolve URL for ${query}`
          );
          if (!queue.currentTrack) queue.delete();
          return utils.printError(interaction, utils.t("commands.play.no_url"));
        }

        let targetUrl = resolvedUrl;
        if (mix) {
          const videoId = resolvedUrl.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
          )?.[1];
          if (videoId) {
            targetUrl =
              "https://www.youtube.com/watch?" +
              `v=${videoId}&list=RD${videoId}`;
          }
        }

        result = await player.search(targetUrl, {
          requestedBy: interaction.user,
          ignoreCache: true
        });
      } else {
        let targetUrl = query;
        if (mix && !query.includes("list=")) {
          const videoId = query.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
          )?.[1];
          if (videoId) {
            targetUrl =
              "https://www.youtube.com/watch?" +
              `v=${videoId}&list=RD${videoId}`;
          }
        }

        result = await player.search(targetUrl, {
          requestedBy: interaction.user
        });
      }

      if ((!result || result.tracks.length === 0) && mix) {
        result = await player.search(
          isManualQuery ? searchPrefix + query : query,
          {
            requestedBy: interaction.user,
            requestOptions: { mode }
          }
        );
      }

      if (!result || result.tracks.length === 0) {
        utils.logInfo(`[${interaction.guild.name}] No results for ${query}`);
        if (!queue.currentTrack) queue.delete();
        return utils.printError(interaction, utils.t("errors.no_results"));
      }

      const entry = queue.tasksQueue.acquire();
      await entry.getTask();

      const songs = result.tracks;

      if (result.playlist) {
        const removed = [];
        const allowed = [];

        for (const t of songs) {
          const playability = utils.canPlayTrack(t);
          const tooLong = utils.isTrackLongerThan(t, utils.MAX_TRACK_LENGTH_MS);

          if (!playability.success || tooLong) {
            removed.push({
              track: t,
              reason: tooLong
                ? utils.t("commands.play.too_long_reason")
                : playability.reason
            });
          } else {
            allowed.push(t);
          }
        }

        if (allowed.length === 0) {
          utils.logInfo(
            `[${interaction.guild.name}] Playlist empty after filtering`
          );
          queue.tasksQueue.release();
          if (!queue.currentTrack) queue.delete();
          return utils.printError(
            interaction,
            utils.t("commands.play.playlist_unplayable")
          );
        }

        if (removed.length > 0) {
          const removedStr =
            removed
              .slice(0, 3)
              .map((r) => `${r.track.title} (${r.reason})`)
              .join(", ") + (removed.length > 3 ? "..." : "");

          const maxLenStr = utils.msToTime(utils.MAX_TRACK_LENGTH_MS);
          await utils.sleep(2000);
          utils.printError(
            interaction.channel,
            utils.t("commands.play.playlist_skipped", {
              count: removed.length,
              maxDuration: maxLenStr
            }),
            new Error(`Removed: ${removedStr}`)
          );
        }

        if (force || next) {
          queue.options.noEmitInsert = true;
          allowed.forEach((track, index) => {
            queue.insertTrack(track, index);
          });
          queue.options.noEmitInsert = false;
          queue.metadata.page = 0;

          if (next && queue.currentTrack) {
            queue.emit("audioTracksAdd", queue, allowed);
          }
        } else {
          queue.addTrack(allowed);
        }
      } else {
        const song = songs[0];
        const playability = utils.canPlayTrack(song);

        if (!playability.success) {
          utils.logInfo(
            `[${interaction.guild.name}] ` +
              `Unplayable: ${song.title} (${playability.status})`
          );
          queue.tasksQueue.release();
          if (!queue.currentTrack) queue.delete();
          return utils.printError(
            interaction,
            utils.t("commands.play.unplayable", {
              reason: playability.reason,
              status: playability.status,
              title: song.title,
              url: song.url
            })
          );
        }

        if (utils.isTrackLongerThan(song, utils.MAX_TRACK_LENGTH_MS)) {
          utils.logInfo(
            `[${interaction.guild.name}] Track too long: ${song.title}`
          );
          queue.tasksQueue.release();
          if (!queue.currentTrack) queue.delete();
          const maxLenStr = utils.msToTime(utils.MAX_TRACK_LENGTH_MS);
          return utils.printError(
            interaction,
            utils.t("commands.play.too_long_track", {
              maxDuration: maxLenStr,
              title: song.title,
              url: song.url
            })
          );
        }

        if (force) {
          queue.options.noEmitInsert = true;
          queue.insertTrack(song, 0);
          queue.options.noEmitInsert = false;
          queue.metadata.page = 0;
        } else if (next) {
          queue.insertTrack(song, 0);
          queue.metadata.page = 0;
        } else {
          queue.addTrack(song);
        }
      }

      if (!queue.connection) await queue.connect(voiceChannel);

      if (force) {
        await utils.sendLoadingStatus(queue);
        await interaction.deleteReply().catch(() => {});
        if (queue.currentTrack) {
          queue.node.skip();
        } else {
          await queue.node.play();
        }
      } else {
        await utils.startQueuePlayback(queue, interaction);
      }
    } catch (err) {
      if (queue && !queue.currentTrack) queue.delete();
      utils.logInfo("Searching/Playing error", err);
      if (queue?.tasksQueue) queue.tasksQueue.release();
      return utils.printError(interaction, utils.t("commands.play.error"));
    } finally {
      if (queue?.tasksQueue) queue.tasksQueue.release();
    }
  }
};
