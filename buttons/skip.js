const utils = require("../utils");

module.exports = {
  name: "skip",
  run: ({ interaction }) =>
    utils.handleButton(interaction, async (queue) => {
      queue.node.skip();
      await utils.sendLoadingStatus(queue);
    })
};
