const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription(utils.t("commands.nowplaying.description"))
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = utils.requireQueue(interaction);
    if (!queue) return;
    await utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
