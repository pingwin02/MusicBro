const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Usuwa wybrany utwór z kolejki")
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Numer utworu w kolejce")
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

    queue.node.remove(songNumber - 1);
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
