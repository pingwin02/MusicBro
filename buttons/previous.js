const utils = require("../utils");

module.exports = {
  name: "previous",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.metadata.page = Math.max((queue.metadata.page || 0) - 1, 0);
      utils.sendStatus(queue);
    })
};
