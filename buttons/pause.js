const utils = require("../utils");

module.exports = {
  name: "pause",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.node.setPaused(true);
      utils.sendStatus(queue);
    })
};
