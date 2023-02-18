const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Wstrzymuje odtwarzanie utworu")
    .setDMPermission(false),
  run: async ({ client, interaction }) => {
    await interaction.deferReply();
    const queue = client.player.getQueue(interaction.guildId);
    if (!queue)
      return await interaction
        .editReply(":x: Nie ma nic w kolejce! Użyj `/play` aby coś odtworzyć.")
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000);
        });
    queue.setPaused(true);

    const currentSong = queue.current;

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `:pause_button: Wstrzymałem odtwarzanie **${currentSong.title}**. Użyj \`/resume\` aby wznowić odtwarzanie.`
            )
            .setThumbnail(currentSong.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
