const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { QueryType } = require("discord-player");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Puszcza muzykę z Youtuba i nie tylko!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("szukaj")
        .setDescription("Szuka utworu po frazie lub linku")
        .addStringOption((option) =>
          option
            .setName("fraza")
            .setDescription("Wyszukiwana fraza lub link do utworu")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("playlista")
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
      return interaction
        .editReply(":x: Musisz być na kanale głosowym!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    if (
      !voiceChannel.permissionsFor(client.user).has("ViewChannel") ||
      !voiceChannel.permissionsFor(client.user).has("Connect") ||
      !voiceChannel.permissionsFor(client.user).has("Speak")
    )
      return interaction
        .editReply(":x: Nie mogę dołączyć do kanału głosowego!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    const queue = await client.player.createQueue(interaction.guild, {
      leaveOnEnd: true,
      leaveOnStop: true,
      leaveOnEmpty: true,
    });
    if (!queue.connection) await queue.connect(voiceChannel);

    let embed = new EmbedBuilder();

    if (interaction.options.getSubcommand() === "playlista") {
      let url = interaction.options.getString("url");
      const result = await client.player.search(url, {
        requestedBy: interaction.user,
        searchEngine: QueryType.YOUTUBE_PLAYLIST,
      }).catch((err) => {
        console.log(err);
      });;
      if (!result || result.tracks.length === 0)
        return interaction
          .editReply(":x: Nie znaleziono playlisty")
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });

      const playlist = result.playlist;
      const song = result.tracks[0];
      await queue.addTracks(result.tracks);
      embed
        .setTitle(`Dodano **${result.tracks.length}** utworów do kolejki`)
        .setDescription(`[**${playlist.title}**](${playlist.url})`)
        .setThumbnail(song.thumbnail)
        .setFooter({ text: `Dodano przez ${song.requestedBy.tag}` });
    } else if (interaction.options.getSubcommand() === "szukaj") {
      let url = interaction.options.getString("fraza");
      const result = await client.player.search(url, {
        requestedBy: interaction.user,
        searchEngine: QueryType.AUTO,
      }).catch((err) => {
        console.log(err);
      });
      if (!result || result.tracks.length === 0)
        return interaction
          .editReply(":x: Nie znaleziono utworu")
          .then((msg) => {
            setTimeout(() => msg.delete(), 5000);
          });

      const song = result.tracks[0];
      await queue.addTrack(song);
      embed
        .setTitle("Dodano utwór do kolejki")
        .setDescription(`[**${song.title}**](${song.url}) [${song.duration}]`)
        .setThumbnail(song.thumbnail)
        .setFooter({ text: `Dodano przez ${song.requestedBy.tag}` });
    }
    if (!queue.playing) await queue.play();
    await interaction.editReply({ embeds: [embed] }).then((msg) => {
      setTimeout(() => msg.delete(), 10000);
    });
  },
};
