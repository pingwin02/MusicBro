const { useQueue } = require("discord-player");

module.exports = {
  name: "stop",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.delete();
    }
  }
};
