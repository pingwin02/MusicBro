const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.Error,
  async execute(queue, error) {
    utils.logInfo(`[${queue.guild.name}] error event`, error);
    utils.printError(
      queue.metadata.textChannel,
      "Wystąpił błąd podczas odtwarzania muzyki! Spróbuj ponownie później.",
      error
    );
    queue.delete();
  }
};
