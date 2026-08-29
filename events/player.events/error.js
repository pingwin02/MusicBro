const { GuildQueueEvent } = require("discord-player");
const utils = require("../../utils");

module.exports = {
  name: GuildQueueEvent.Error,
  async execute(queue, error) {
    utils.logInfo(`[${queue.guild.name}] error event`, error);
    utils.printError(
      queue.metadata.textChannel,
      utils.t("errors.playback_error"),
      error
    );
    queue.delete();
  }
};
