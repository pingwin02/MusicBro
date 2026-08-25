const utils = require("../utils");

module.exports = {
  name: "shuffle",
  run: ({ interaction }) =>
    utils.handleButton(interaction, (queue) => {
      queue.tracks.shuffle();
      utils.sendStatus(queue);
    })
};
