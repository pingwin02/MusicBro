const { useQueue } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "next",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.metadata.page++;
      sendStatus(queue);
    }
  }
};
