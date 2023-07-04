const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { QueryType } = require("discord-player");
const { printError, sendError, INFO_TIMEOUT, logger } = require("../index.js");

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

    const url = interaction.options.getString("query");
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
        "Nie znaleziono! Upewnij się, że link lub fraza jest poprawna.\nSprawdź również, czy na film nie nałożono ograniczenia wiekowego. :underage:"
      );

    const songs = result.tracks;
    const song = songs[0];

    if (!result.playlist) {
      embed
        .setTitle("Dodano utwór do kolejki")
        .setDescription(
          `[**${song.title}**](${song.url}) [${song.duration}]\n Kanał **${song.author}**`
        );
      await queue.addTrack(song);
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
      .setFooter({ text: `Dodano przez ${song.requestedBy.tag}` });

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
