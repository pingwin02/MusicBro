const { useQueue, QueueRepeatMode } = require("discord-player");
const { sendStatus } = require("../functions");

module.exports = {
  name: "loopTrack",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    queue.setRepeatMode(QueueRepeatMode.TRACK);
    sendStatus(queue);
  },
};
