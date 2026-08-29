const utils = require("../utils");

module.exports = {
  name: "stop",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      if (queue.metadata) {
        queue.metadata.skippedByUser = true;
      }
      queue.delete();
    })
};
