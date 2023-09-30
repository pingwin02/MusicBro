const { useQueue } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "refresh",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (
      !queue ||
      !queue.metadata ||
      !queue.metadata.statusMessage ||
      queue.metadata.statusMessage != interaction.message.id
    )
      await interaction.deleteReply();
    sendStatus(queue);
  },
};
