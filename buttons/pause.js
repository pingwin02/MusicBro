const { useQueue } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "pause",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (!queue) await interaction.deleteReply();
    queue.node.setPaused(true);
    sendStatus(queue);
  },
};
