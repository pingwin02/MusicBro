const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { QueryType } = require("discord-player");
const { printError, logInfoDate, INFO_TIMEOUT } = require("../functions");

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
    .addStringOption((option) =>
      option
        .setName("search_engine")
        .setDescription("Wybierz źródło wyszukiwania (opcjonalne)")
        .setRequired(false)
        .addChoices(
          {
            name: "YouTube",
            value: "YouTube",
          },
          {
            name: "Spotify",
            value: "Spotify",
          },
          {
            name: "SoundCloud",
            value: "SoundCloud",
          }
        )
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
        metadata: interaction.channel,
      });
    } catch (err) {
      logInfoDate(`Creating node: ${err}`, 1);
      return printError(
        interaction,
        "Wystąpił błąd podczas tworzenia węzła! Spróbuj ponownie później."
      );
    }

    let embed = new EmbedBuilder();

    const searchEngine = interaction.options.getString("search_engine");

    let engine;
    switch (searchEngine) {
      case "YouTube":
        engine = QueryType.YOUTUBE;
        break;
      case "Spotify":
        engine = QueryType.SPOTIFY_SEARCH;
        break;
      case "SoundCloud":
        engine = QueryType.SOUNDCLOUD;
        break;
      default:
        engine = QueryType.AUTO;
        break;
    }

    const url = interaction.options.getString("query");
    try {
      const result = await client.player.search(url, {
        requestedBy: interaction.user,
        searchEngine: engine,
      });
      if (!result || result.tracks.length === 0) {
        return printError(
          interaction,
          "Nie znaleziono! Spróbuj ponownie później.\nUpewnij się, że link lub fraza jest poprawna."
        );
      }

      const songs = result.tracks;
      const song = songs[0];

      songs.forEach((song) => {
        if (song.__metadata.nsfw) {
          printError(
            interaction,
            `Żądany utwór [**${song.title}**](${song.url}) [${song.duration}]\n jest oznaczony jako NSFW i nie może zostać odtworzony! :underage:`,
            true
          );
          logInfoDate(
            `NSFW song: ${song.title} (${song.url}) was tried to play at ${interaction.guild.name} by ${interaction.user.username}`,
            2
          );
          songs.splice(songs.indexOf(song), 1);
        }
      });

      if (songs.length === 0) return;

      const force = interaction.options.getBoolean("force") || false;

      if (!result.playlist) {
        embed
          .setTitle("Dodano utwór do kolejki")
          .setDescription(
            `[**${song.title}**](${song.url}) [${song.duration}]\n Autor **${song.author}**`
          );
        if (force) await queue.insertTrack(song, 0);
        else await queue.addTrack(song);
      } else {
        embed
          .setTitle(`Dodano **${result.tracks.length}** utworów do kolejki`)
          .setDescription(
            `[**${result.playlist.title}**](${result.playlist.url})`
          );
        await queue.addTrack(songs);
      }

      embed
        .setThumbnail(song.thumbnail)
        .setFooter({ text: `Dodano przez ${song.requestedBy.username}` });
    } catch (err) {
      queue.delete();
      logInfoDate(`Searching song: ${err}`, 1);
      return printError(
        interaction,
        "Wystąpił błąd podczas wyszukiwania utworu!\nSpróbuj ponownie później."
      );
    }

    try {
      if (!queue.connection) await queue.connect(voiceChannel);
    } catch (err) {
      queue.delete();
      logInfoDate(`Connecting to voice channel: ${err}`, 1);
      return printError(
        interaction,
        "Wystąpił błąd podczas łączenia z kanałem głosowym!"
      );
    }

    try {
      if (!queue.node.isPlaying() && !queue.currentTrack)
        await queue.node.play();
    } catch (err) {
      queue.delete();
      logInfoDate(`Playing song: ${err.name}`, 1);
      return printError(
        interaction,
        "Wystąpił błąd podczas odtwarzania utworu!\nSpróbuj ponownie później."
      );
    }

    embed.setColor("Green");
    await interaction.editReply({ embeds: [embed] }).then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            logInfoDate(`Deleting play message: ${err}`, 1);
          }),
        INFO_TIMEOUT
      );
    });
  },
};
