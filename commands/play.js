const { useMainPlayer } = require("discord-player");
const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Dodaje muzykę do kolejki")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Wyszukiwana fraza lub link do utworu/playlisty")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("mix")
        .setDescription("Dodaje składankę podobnych utworów (ok. 25 pozycji)")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("next")
        .setDescription(
          "Dodaje utwór na sam początek kolejki (odtworzy się jako następny)"
        )
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("force")
        .setDescription("Odtwarza natychmiastowo utwór pomijając kolejkę")
        .setRequired(false)
    )
    .setContexts(InteractionContextType.Guild),

  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const voiceChannel = utils.validateVoiceChannel(client, interaction);
    if (!voiceChannel) return;

    const mix = interaction.options.getBoolean("mix") || false;
    const next = interaction.options.getBoolean("next") || false;
    const force = interaction.options.getBoolean("force") || false;

    if (force && next) {
      return utils.printError(
        interaction,
        "Opcje `force` oraz `next` nie mogą być włączone jednocześnie!"
      );
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
        const initialResult = await player.search("youtube: " + query, {
          requestedBy: interaction.user,
          ignoreCache: true
        });

        if (!initialResult || initialResult.tracks.length === 0) {
          utils.logInfo(`[${interaction.guild.name}] No results for ${query}`);
          if (!queue.currentTrack) queue.delete();
          return utils.printError(interaction, utils.NO_RESULTS_MESSAGE);
        }

        const resolvedUrl = initialResult.tracks[0]?.url;

        if (!resolvedUrl) {
          utils.logInfo(
            `[${interaction.guild.name}] Could not resolve URL for ${query}`
          );
          if (!queue.currentTrack) queue.delete();
          return utils.printError(
            interaction,
            "Nie udało się rozpoznać adresu URL dla wyszukanego utworu."
          );
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
          isManualQuery ? "youtube: " + query : query,
          {
            requestedBy: interaction.user
          }
        );
      }

      if (!result || result.tracks.length === 0) {
        utils.logInfo(`[${interaction.guild.name}] No results for ${query}`);
        if (!queue.currentTrack) queue.delete();
        return utils.printError(interaction, utils.NO_RESULTS_MESSAGE);
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
              reason: tooLong ? "Zbyt długi" : playability.reason
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
            "Żaden utwór z playlisty nie może zostać odtworzony."
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
            `Pominięto **${removed.length}** utworów ` +
              `(zablokowane lub > ${maxLenStr}).`,
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
            `Nie można odtworzyć [**${song.title}**](${song.url})\n` +
              `**Powód:** ${playability.reason} (\`${playability.status}\`)`
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
            `Utwór [**${song.title}**](${song.url}) ` +
              `przekracza limit **${maxLenStr}**.`
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
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas przetwarzania utworu."
      );
    } finally {
      if (queue?.tasksQueue) queue.tasksQueue.release();
    }
  }
};
