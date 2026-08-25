const utils = require("../utils");

module.exports = {
  name: "stop",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.delete();
    })
};
