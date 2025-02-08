const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "refresh",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (
      !queue ||
      !queue.metadata ||
      !queue.metadata.statusMessage ||
      queue.metadata.statusMessage.id !== interaction.message.id
    ) {
      await interaction.deleteReply();
    } else {
      utils.sendStatus(queue);
    }
  }
};
