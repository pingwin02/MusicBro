const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { QueryType } = require("discord-player");

const { printError, sendError, INFO_TIMEOUT, logger } = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Dodaje muzykę do kolejki")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Szuka utworu po frazie lub linku")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Wyszukiwana fraza lub link do utworu")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("playlist")
        .setDescription("Szuka playlisty po linku")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("URL do playlisty")
            .setRequired(true)
        )
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

    const queue = await client.player.nodes.create(interaction.guild, {
      leaveOnEnd: true,
      leaveOnStop: true,
      leaveOnEmpty: true,
      metadata: interaction.channel,
    });

    if (!queue.connection) await queue.connect(voiceChannel);

    let embed = new EmbedBuilder();

    if (interaction.options.getSubcommand() === "playlist") {
      let url = interaction.options.getString("url");
      const result = await client.player
        .search(url, {
          requestedBy: interaction.user,
          searchEngine: QueryType.YOUTUBE_PLAYLIST,
        })
        .catch((err) => {
          sendError("Szukanie playlisty", err, interaction);
        });
      if (!result || result.tracks.length === 0)
        return printError(
          interaction,
          "Nie znaleziono playlisty! Upewnij się, że link jest poprawny."
        );

      const playlist = result.playlist;
      const song = result.tracks[0];
      await queue.addTrack(result.tracks);
      embed
        .setTitle(`Dodano **${result.tracks.length}** utworów do kolejki`)
        .setDescription(`[**${playlist.title}**](${playlist.url})`)
        .setThumbnail(song.thumbnail)
        .setFooter({ text: `Dodano przez ${song.requestedBy.tag}` });
    } else if (interaction.options.getSubcommand() === "search") {
      let url = interaction.options.getString("query");
      const result = await client.player
        .search(url, {
          requestedBy: interaction.user,
          searchEngine: QueryType.AUTO,
        })
        .catch((err) => {
          sendError("Szukanie utworu", err, interaction);
        });
      if (!result || result.tracks.length === 0)
        return printError(
          interaction,
          "Nie znaleziono utworu! Upewnij się, że link lub fraza jest poprawna.\nSprawdź również, czy na film nie nałożono ograniczenia wiekowego. :underage:"
        );

      const song = result.tracks[0];
      await queue.addTrack(song);
      embed
        .setTitle("Dodano utwór do kolejki")
        .setDescription(
          `[**${song.title}**](${song.url}) [${song.duration}]\n Kanał **${song.author}**`
        )
        .setThumbnail(song.thumbnail)
        .setFooter({ text: `Dodano przez ${song.requestedBy.tag}` });
    }

    if (!queue.node.isPlaying() && !queue.currentTrack)
      await queue.node.play().catch((err) => {
        sendError("Odtwarzanie utworu", err, interaction);
      });

    embed.setColor("Green");
    await interaction.editReply({ embeds: [embed] }).then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            sendError("Kasowanie wiadomości", err, interaction);
          }),
        INFO_TIMEOUT
      );
    });
  },
};
