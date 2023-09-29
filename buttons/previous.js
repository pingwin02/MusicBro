const { useQueue } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "previous",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    queue.metadata.page--;
    sendStatus(queue);
  },
};
