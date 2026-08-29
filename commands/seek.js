const { InteractionContextType, SlashCommandBuilder } = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription(utils.t("commands.seek.description"))
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription(utils.t("commands.seek.options.time"))
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = utils.requireQueue(interaction);
    if (!queue) return;

    const input = interaction.options.getString("time").trim();
    const parts = input.split(":");
    const formatError = utils.t("commands.seek.format_error");

    let minutes, seconds;

    if (parts.length === 1 || parts.length === 2) {
      const [minPart, secPart = "0"] = parts;
      if (isNaN(minPart) || isNaN(secPart)) {
        return utils.printError(interaction, formatError);
      }
      minutes = parseInt(minPart, 10);
      seconds = parseInt(secPart, 10);
    } else {
      return utils.printError(interaction, formatError);
    }

    const targetMs = (minutes * 60 + seconds) * 1000;

    const currentTrack = queue.currentTrack;
    if (!currentTrack || isNaN(currentTrack.durationMS)) {
      return utils.printError(
        interaction,
        utils.t("commands.seek.no_duration")
      );
    }

    if (targetMs >= currentTrack.durationMS) {
      return utils.printError(
        interaction,
        utils.t("commands.seek.out_of_range", {
          duration: currentTrack.duration
        })
      );
    }

    await queue.node.seek(targetMs);
    queue.metadata.seeked = true;
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
