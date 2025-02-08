const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { QueueRepeatMode, useMainPlayer } = require("discord-player");
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

      if (force) {
        if (result.playlist) {
          queue.tasksQueue.release();
          return utils.printError(
            interaction,
            "Opcja `force` jest wyłączona dla playlist!"
          );
        }
        queue.insertTrack(song);
        queue.setRepeatMode(QueueRepeatMode.OFF);
        queue.metadata.page = 0;
      } else {
        queue.addTrack(result.playlist ? songs : song);
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
