const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.PlayerError,
  async execute(queue, error) {
    utils.logInfo(`[${queue.guild.name}] playerError event`, error);
    utils.printError(
      queue.metadata.textChannel,
      "Wystąpił błąd podczas odtwarzania muzyki! Spróbuj ponownie później.",
      error
    );
    queue.delete();
  }
};
