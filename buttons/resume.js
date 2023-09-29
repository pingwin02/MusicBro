const { useQueue } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "resume",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    queue.node.setPaused(false);
    sendStatus(queue);
  },
};
