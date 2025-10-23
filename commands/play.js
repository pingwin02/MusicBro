const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { QueueRepeatMode, useMainPlayer } = require("discord-player");
const utils = require("../utils");

// 10 minutes 30 seconds
const MAX_TRACK_LENGTH_MS = 10 * 60 * 1000 + 30 * 1000;

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
    const query = interaction.options.getString("query");
    try {
      const result = await player.search(query, {
        requestedBy: interaction.user
      });
      if (!result || result.tracks.length === 0) {
        utils.logInfo(`[${interaction.guild.name}] No results for ${query}`);
        if (!queue.currentTrack) {
          queue.delete();
        }
        return utils.printError(
          interaction,
          "Nie znaleziono! Spróbuj ponownie później.\n" +
            "Upewnij się, że link lub fraza jest poprawna.\n\n" +
            "Wspierane serwisy: <:YouTube:1156904255979016203> Youtube"
        );
      }
      const entry = queue.tasksQueue.acquire();

      await entry.getTask();

      const songs = result.tracks;
      const song = songs[0];

      if (song.__metadata.nsfw) {
        utils.logInfo(
          `[${interaction.guild.name}] NSFW song: ${song.title} (${song.url})`
        );
        queue.tasksQueue.release();
        return utils.printError(
          interaction,
          `Żądany utwór [**${song.title}**](${song.url}) ` +
            `[${song.duration}]\n jest oznaczony jako NSFW ` +
            "i nie może zostać odtworzony! :underage:"
        );
      }

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
          if (utils.isTrackLongerThan(t, MAX_TRACK_LENGTH_MS)) removed.push(t);
          else allowed.push(t);
        }

        if (allowed.length === 0) {
          utils.logInfo(
            `Playlist contains only too long track(s): ${removed
              .map((t) => t.title)
              .slice(0, 3)
              .join(", ")}${removed.length > 3 ? ", ..." : ""}`
          );
          queue.tasksQueue.release();
          if (!queue.currentTrack) queue.delete();
          return utils.printError(
            interaction,
            "Wszystkie utwory na playliście są dłuższe niż limit " +
              `**${utils.msToTime(MAX_TRACK_LENGTH_MS)}** ` +
              "i nie można dodać żadnych pozycji."
          );
        }

        if (removed.length > 0) {
          const removedStr =
            removed
              .map((t) => t.title)
              .slice(0, 3)
              .join(", ") + (removed.length > 3 ? ", and more..." : "");

          utils.logInfo(
            `Removed ${removed.length} too long track(s) ` +
              `from playlist: ${removedStr}`
          );

          setTimeout(() => {
            utils.printError(
              interaction.channel,
              "Pominięto utwory dłuższe niż limit " +
                `**${utils.msToTime(MAX_TRACK_LENGTH_MS)}**.`,
              new Error(`Removed tracks from playlist: ${removedStr}`)
            );
          }, 5000);
        }

        queue.addTrack(allowed);
      } else {
        if (utils.isTrackLongerThan(song, MAX_TRACK_LENGTH_MS)) {
          utils.logInfo(
            `Track too long: ${song.title} (${song.url}) [${song.duration}]`
          );
          queue.tasksQueue.release();
          if (!queue.currentTrack) queue.delete();
          return utils.printError(
            interaction,
            "Żądany utwór " +
              `[**${song.title}**](${song.url}) [${song.duration}] ` +
              "jest dłuższy niż dozwolony limit " +
              `**${utils.msToTime(MAX_TRACK_LENGTH_MS)}** ` +
              "i nie może zostać odtworzony.\n\n"
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
    } catch (err) {
      queue.delete();
      utils.logInfo("Searching song", err);
      queue.tasksQueue.release();
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas wyszukiwania utworu!\nSpróbuj ponownie później."
      );
    }
    try {
      if (!queue.connection) await queue.connect(voiceChannel);
    } catch (err) {
      queue.delete();
      utils.logInfo("Connecting to voice channel", err);
      queue.tasksQueue.release();
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas łączenia z kanałem głosowym!\n" +
          "Spróbuj ponownie później."
      );
    }
    try {
      if (force || !queue.currentTrack) {
        await queue.node.play();
      }
    } catch (err) {
      queue.delete();
      utils.logInfo("Playing song", err);
      queue.tasksQueue.release();
      return utils.printError(
        interaction,
        "Wystąpił błąd podczas odtwarzania utworu!\nSpróbuj ponownie później."
      );
    } finally {
      queue.tasksQueue.release();
      await interaction.deleteReply();
    }
  }
};
