const { SlashCommandBuilder } = require("discord.js");
const { printError, logInfo } = require("../functions");

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
        .setDescription("Jeśli włączone, dodaje utwór na początek kolejki")
        .setRequired(false)
    )
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel)
      return printError(interaction, "Musisz być na kanale głosowym!");
    if (
      !voiceChannel.permissionsFor(client.user).has("ViewChannel") ||
      !voiceChannel.permissionsFor(client.user).has("Connect") ||
      !voiceChannel.permissionsFor(client.user).has("Speak")
    )
      return printError(
        interaction,
        "Nie mam uprawnień do połączenia się z kanałem głosowym!"
      );
    if (voiceChannel.full)
      return printError(interaction, "Kanał jest pełny! Spróbuj później.");
    let queue;
    try {
      queue = await client.player.nodes.create(interaction.guild, {
        leaveOnEnd: true,
        leaveOnStop: true,
        leaveOnEmpty: true,
        metadata: {
          textChannel: interaction.channel,
          statusMessage: null,
          page: 0,
        },
      });
    } catch (err) {
      logInfo("Creating node", err);
      return printError(
        interaction,
        "Wystąpił błąd podczas tworzenia węzła! Spróbuj ponownie później."
      );
    }
    const query = interaction.options.getString("query");
    try {
      const result = await client.player.search(query, {
        requestedBy: interaction.user,
      });
      if (!result || result.tracks.length === 0) {
        logInfo(`[${interaction.guild.name}] No results for ${query}`);
        return printError(
          interaction,
          "Nie znaleziono! Spróbuj ponownie później.\nUpewnij się, że link lub fraza jest poprawna.\n\n" +
            "Wspierane serwisy: <:YouTube:1156904255979016203> Youtube"
        );
      }
      const songs = result.tracks;
      const song = songs[0];

      let nsfwSongs = [];
      songs.forEach((song) => {
        if (song.__metadata.nsfw) {
          logInfo(
            `[${interaction.guild.name}] NSFW song: ${song.title} (${song.url})`
          );
          printError(
            interaction,
            `Żądany utwór [**${song.title}**](${song.url}) [${song.duration}]\n jest oznaczony jako NSFW` +
              ` i nie może zostać odtworzony! :underage:`
          );
          nsfwSongs.push(song);
        }
      });
      nsfwSongs.forEach((song) => {
        songs.splice(songs.indexOf(song), 1);
      });
      if (songs.length === 0) return;
      const force = interaction.options.getBoolean("force") || false;
      if (!result.playlist) {
        if (force) await queue.insertTrack(song, 0);
        else await queue.addTrack(song);
      } else {
        await queue.addTrack(songs);
      }
    } catch (err) {
      queue.delete();
      logInfo("Searching song", err);
      return printError(
        interaction,
        "Wystąpił błąd podczas wyszukiwania utworu!\nSpróbuj ponownie później."
      );
    }
    try {
      if (!queue.connection) await queue.connect(voiceChannel);
    } catch (err) {
      queue.delete();
      logInfo("Connecting to voice channel", err);
      return printError(
        interaction,
        "Wystąpił błąd podczas łączenia z kanałem głosowym!\nSpróbuj ponownie później."
      );
    }
    try {
      if (!queue.node.isPlaying() && !queue.currentTrack)
        await queue.node.play();
    } catch (err) {
      queue.delete();
      logInfo("Playing song", err);
      return printError(
        interaction,
        "Wystąpił błąd podczas odtwarzania utworu!\nSpróbuj ponownie później."
      );
    }
    await interaction.deleteReply();
  },
};
