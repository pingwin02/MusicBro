const { useQueue } = require("discord-player");

module.exports = {
  name: "delete",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (queue && queue.metadata) {
      queue.metadata.statusMessage = null;
    }
    await interaction.deleteReply();
  },
};
