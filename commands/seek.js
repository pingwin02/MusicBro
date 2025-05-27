const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { useQueue } = require("discord-player");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription(
      "Przewija aktualnie odtwarzany utwór do podanego czasu (mm:ss lub mm)"
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Czas w formacie mm:ss lub mm (np. 1:30 lub 2)")
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild),
  run: async ({ interaction }) => {
    await interaction.deferReply();
    const queue = useQueue(interaction.guildId);
    if (!queue)
      return utils.printError(
        interaction,
        "Kolejka pusta! Użyj `/play` aby coś odtworzyć."
      );

    const input = interaction.options.getString("time").trim();
    const parts = input.split(":");
    const formatError =
      "Nieprawidłowy format czasu! Użyj `mm:ss` lub `mm`, np. `2:15` albo `3`.";

    let minutes = 0,
      seconds = 0;

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
        "Nie można przewinąć tego utworu. Brak informacji o długości."
      );
    }

    if (targetMs >= currentTrack.durationMS) {
      return utils.printError(
        interaction,
        `Podaj czas krótszy niż długość utworu (**${currentTrack.duration}**).`
      );
    }

    await queue.node.seek(targetMs);
    utils.sendStatus(queue);
    await interaction.deleteReply();
  }
};
