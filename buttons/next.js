const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "next",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guildId);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.metadata.page++;
      utils.sendStatus(queue);
    }
  }
};
