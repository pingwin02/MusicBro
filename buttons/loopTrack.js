const { QueueRepeatMode } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "loopTrack",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.setRepeatMode(QueueRepeatMode.TRACK);
      utils.sendStatus(queue);
    })
};
