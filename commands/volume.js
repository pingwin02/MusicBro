const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription(utils.t("commands.volume.description"))
    .addIntegerOption((option) =>
      option
        .setName("value")
        .setDescription(utils.t("commands.volume.options.value"))
        .setMinValue(1)
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = utils.requireQueue(interaction);
    if (!queue) return;
    queue.node.setVolume(interaction.options.getInteger("value"));
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
