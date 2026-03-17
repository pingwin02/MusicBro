module.exports = {
  name: "embedClose",
  run: async ({ interaction }) => {
    await interaction.deferUpdate().catch(() => {});
    await interaction.message.delete().catch(() => {});
  }
};
