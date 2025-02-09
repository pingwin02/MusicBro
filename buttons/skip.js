const { useQueue } = require("discord-player");

module.exports = {
  name: "skip",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guildId);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.node.skip();
    }
  }
};
