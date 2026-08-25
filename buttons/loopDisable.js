const { QueueRepeatMode } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "loopDisable",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.setRepeatMode(QueueRepeatMode.OFF);
      utils.sendStatus(queue);
    })
};
