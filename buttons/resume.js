const utils = require("../utils");

module.exports = {
  name: "resume",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.node.setPaused(false);
      utils.sendStatus(queue);
    })
};
