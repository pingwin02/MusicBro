const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "pause",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guildId);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.node.setPaused(true);
      utils.sendStatus(queue);
    }
  }
};
