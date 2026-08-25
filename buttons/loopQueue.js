const { QueueRepeatMode } = require("discord-player");
const utils = require("../utils");

module.exports = {
  name: "loopQueue",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.setRepeatMode(QueueRepeatMode.QUEUE);
      utils.sendStatus(queue);
    })
};
