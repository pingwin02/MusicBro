const { useQueue } = require("discord-player");
const { logInfo } = require("../functions");

module.exports = {
  name: "delete",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    queue.metadata.statusMessage = null;
    await interaction.deleteReply();
  },
};
