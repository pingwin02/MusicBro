module.exports = {
  name: "lyricsClose",
  run: async ({ interaction }) => {
    await interaction.deferUpdate().catch(() => {});
    await interaction.message.delete().catch(() => {});
  }
};
