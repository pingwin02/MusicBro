const fs = require("fs");

/**
 * Loads all events from a folder.
 * @param {EventEmitter} receiver - Event receiver.
 * @param {string} folderPath - Path to the folder.
 * @returns {void}
 */
function loadEvents(receiver, folderPath) {
  const events = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of events) {
    const event = require(`../${folderPath}/${file}`);
    if (event.once) {
      receiver.once(event.name, (...args) => event.execute(...args));
    } else {
      receiver.on(event.name, (...args) => event.execute(...args));
    }
  }
}

module.exports = {
  loadEvents
};
