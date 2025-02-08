const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "shuffle",
  run: async ({ interaction }) => {
    await interaction.deferUpdate();
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      await interaction.deleteReply();
    } else {
      queue.tracks.shuffle();
      utils.sendStatus(queue);
    }
  }
};
