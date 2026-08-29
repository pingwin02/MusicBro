const utils = require("../utils");

module.exports = {
  name: "skip",
  run: ({ interaction }) =>
    utils.handleButton(interaction, async (queue) => {
      if (queue.metadata) {
        queue.metadata.skippedByUser = true;
      }
      queue.node.skip();
      await utils.sendLoadingStatus(queue);
    })
};
