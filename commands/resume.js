const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Wznawia odtwarzanie utworu")
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
    queue.setPaused(false);

    const currentSong = queue.current;

    await interaction
      .editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `:arrow_forward: Wznawiam odtwarzanie **${currentSong.title}** <:chad:794955065387515954>`
            )
            .setThumbnail(currentSong.thumbnail),
        ],
      })
      .then((msg) => {
        setTimeout(() => msg.delete(), 10000);
      });
  },
};
