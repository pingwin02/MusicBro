const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jakatomelodia")
    .setDescription("Wyświetla informacje o aktualnie granym utworze"),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return await interaction
        .editReply(":x: Nic nie jest teraz odtwarzane :broken_heart:!")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });

    let bar = queue.createProgressBar({
      queue: false,
      length: 19,
      timecodes: true,
    });

    const song = queue.current;

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `**Teraz gra:**\n [**${song.title}**](${song.url})\n Kanał **${song.author}** \n\n**Postęp:**\n${bar} `
            )
            .setThumbnail(song.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 20000);
      });
  },
};
