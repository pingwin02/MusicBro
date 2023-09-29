const { useQueue, QueueRepeatMode } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "loopQueue",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    queue.setRepeatMode(QueueRepeatMode.QUEUE);
    sendStatus(queue);
  },
};
