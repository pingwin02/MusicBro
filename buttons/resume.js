const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "resume",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.node.setPaused(false);
      utils.sendStatus(queue);
    }
  }
};
