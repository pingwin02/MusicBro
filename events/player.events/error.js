const { GuildQueueEvent } = require("discord-player");
const { logInfo, printError } = require("../../functions");

module.exports = {
  name: GuildQueueEvent.error,
  async execute(queue, error) {
    logInfo(`[${queue.guild.name}] error event`, error);
    printError(
      queue.metadata.textChannel,
      "Wystąpił błąd podczas odtwarzania muzyki! Spróbuj ponownie później.",
      error
    );
  },
};
