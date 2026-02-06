const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { QueueRepeatMode, useMainPlayer } = require("discord-player");
const utils = require("../utils");

const MAX_TRACK_LENGTH_MS = Number.MAX_SAFE_INTEGER;

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
        .setName("force")
        .setDescription(
          "Jeśli włączone, odtwarza natychmiastowo utwór pomijając kolejkę"
        )
        .setRequired(false)
    )
    .setContexts(InteractionContextType.Guild),

  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel)
      return utils.printError(interaction, "Musisz być na kanale głosowym!");

    if (
      !voiceChannel.permissionsFor(client.user).has("ViewChannel") ||
      !voiceChannel.permissionsFor(client.user).has("Connect") ||
      !voiceChannel.permissionsFor(client.user).has("Speak")
    )
      return utils.printError(
        interaction,
        "Nie mam uprawnień do połączenia się z kanałem głosowym!"
      );

    if (voiceChannel.full)
      return utils.printError(
        interaction,
        "Kanał jest pełny! Spróbuj później."
      );

    let queue;
    const player = useMainPlayer();
    const force = interaction.options.getBoolean("force") || false;

    try {
      queue = player.nodes.create(interaction.guild, {
        leaveOnEnd: true,
        leaveOnStop: true,
        leaveOnEmpty: true,
        metadata: {
          textChannel: interaction.channel,
          statusMessage: null,
          page: 0
        }
      });
    } catch (err) {
      utils.logInfo("Creating node", err);
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas tworzenia węzła! Spróbuj ponownie później."
      );
    }

    let query = interaction.options.getString("query");

    if (!query.match(/^https?:\/\//)) {
      query = "youtube: " + query;
    } else if (query.includes("/shorts/")) {
      query = query.replace("/shorts/", "/watch?v=");
    }

    try {
      const result = await player.search(query, {
        requestedBy: interaction.user
      });

      if (!result || result.tracks.length === 0) {
        utils.logInfo(`[${interaction.guild.name}] No results for ${query}`);
        if (!queue.currentTrack) queue.delete();
        return utils.printError(
          interaction,
          "Nie znaleziono! Upewnij się, że link lub fraza jest poprawna.\n\n" +
            "Wspierane serwisy: <:YouTube:1156904255979016203> Youtube"
        );
      }

      const entry = queue.tasksQueue.acquire();
      await entry.getTask();

      const songs = result.tracks;

      if (result.playlist) {
        if (force) {
          queue.tasksQueue.release();
          return utils.printError(
            interaction,
            "Opcja `force` jest wyłączona dla playlist!"
          );
        }

        const removed = [];
        const allowed = [];

        for (const t of songs) {
          const playability = utils.canPlayTrack(t);
          const tooLong = utils.isTrackLongerThan(t, MAX_TRACK_LENGTH_MS);

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

          setTimeout(() => {
            utils.printError(
              interaction.channel,
              `Pominięto **${removed.length}** utworów ` +
                `(zablokowane lub > ${utils.msToTime(MAX_TRACK_LENGTH_MS)}).`,
              new Error(`Removed: ${removedStr}`)
            );
          }, 2000);
        }

        queue.addTrack(allowed);
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

        if (utils.isTrackLongerThan(song, MAX_TRACK_LENGTH_MS)) {
          utils.logInfo(
            `[${interaction.guild.name}] Track too long: ${song.title}`
          );
          queue.tasksQueue.release();
          if (!queue.currentTrack) queue.delete();
          return utils.printError(
            interaction,
            `Utwór [**${song.title}**](${song.url}) ` +
              `przekracza limit **${utils.msToTime(MAX_TRACK_LENGTH_MS)}**.`
          );
        }

        if (force) {
          queue.insertTrack(song);
          queue.setRepeatMode(QueueRepeatMode.OFF);
          queue.metadata.page = 0;
        } else {
          queue.addTrack(song);
        }
      }

      if (!queue.connection) await queue.connect(voiceChannel);
      if (force || !queue.currentTrack) {
        await queue.node.play();
      }
    } catch (err) {
      if (queue) queue.delete();
      utils.logInfo("Searching/Playing error", err);
      if (queue?.tasksQueue) queue.tasksQueue.release();
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas przetwarzania utworu."
      );
    } finally {
      if (queue?.tasksQueue) queue.tasksQueue.release();
      if (interaction.deferred || interaction.replied) {
        await interaction.deleteReply().catch(() => {});
      }
    }
  }
};
