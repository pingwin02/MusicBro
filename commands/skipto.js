const { QueueRepeatMode } = require("discord-player");
const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription(utils.t("commands.skipto.description"))
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription(utils.t("commands.skipto.options.number"))
        .setMinValue(1)
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = utils.requireQueue(interaction);
    if (!queue) return;

    const songNumber = interaction.options.getInteger("number");
    if (!utils.validateTrackNumber(interaction, queue, songNumber)) return;

    if (queue.metadata) {
      queue.metadata.skippedByUser = true;
    }
    queue.node.skipTo(songNumber - 1);
    queue.setRepeatMode(QueueRepeatMode.OFF);
    if (queue.node.isPaused()) queue.node.resume();
    await utils.sendLoadingStatus(queue);
    await interaction.deleteReply();
  }
};
