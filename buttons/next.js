const utils = require("../utils");

module.exports = {
  name: "next",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.metadata.page = (queue.metadata.page || 0) + 1;
      utils.sendStatus(queue);
    })
};
