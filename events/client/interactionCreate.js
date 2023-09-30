const { Events } = require("discord.js");
const { logInfo, printError } = require("../../functions");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const user = interaction.author || interaction.user;
    const client = interaction.client;

    try {
      if (!interaction.guild)
        logInfo(`[DM] @${user.username} used ${interaction}`);
      else if (interaction.isButton()) {
        logInfo(
          `[${interaction.guild.name}] @${user.username} used ${interaction.customId} button in #${interaction.channel.name}`
        );
      } else
        logInfo(
          `[${interaction.guild.name}] @${user.username} used ${interaction} in #${interaction.channel.name}`
        );

      if (
        interaction.guild &&
        (!interaction.channel.permissionsFor(client.user).has("SendMessages") ||
          !interaction.channel.permissionsFor(client.user).has("ViewChannel"))
      ) {
        return printError(interaction, "Nie mam uprawnień do tego kanału!");
      }

      const collection = interaction.isCommand()
        ? client.slashcommands
        : client.buttoncommands;

      await collection
        .get(interaction.commandName || interaction.customId)
        .run({ client, interaction });
    } catch (err) {
      logInfo(
        `/${interaction.commandName || interaction.customId} command`,
        err
      );
      if (interaction.channel) {
        return printError(
          interaction.channel,
          "Wystąpił błąd podczas wykonywania komendy! Spróbuj ponownie później.",
          err
        );
      }
    }
  },
};
