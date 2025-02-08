const { useQueue, QueueRepeatMode } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "loopDisable",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.setRepeatMode(QueueRepeatMode.OFF);
      utils.sendStatus(queue);
    }
  }
};
