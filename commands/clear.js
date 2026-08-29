const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription(utils.t("commands.clear.description"))
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = utils.requireQueue(interaction, { checkEmpty: true });
    if (!queue) return;
    queue.clear();
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
