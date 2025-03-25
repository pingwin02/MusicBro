const { Events } = require("discord.js");
const utils = require("../../utils");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      const client = interaction.client;

      if (!interaction.guild)
        utils.logInfo(`[DM] @${interaction.user.username} used ${interaction}`);
      else if (interaction.isButton()) {
        utils.logInfo(
          `[${interaction.guild.name}] @${interaction.user.username} ` +
            `used ${interaction.customId} button ` +
            `in #${interaction.channel.name}`
        );
      } else
        utils.logInfo(
          `[${interaction.guild.name}] @${interaction.user.username} ` +
            `used ${interaction} in #${interaction.channel.name}`
        );

      if (
        interaction.guild &&
        (!interaction.channel.permissionsFor(client.user).has("SendMessages") ||
          !interaction.channel.permissionsFor(client.user).has("ViewChannel"))
      ) {
        return utils.printError(
          interaction,
          "Nie mam uprawnień do tego kanału!"
        );
      }

      const botVoiceChannel = interaction.guild?.members?.me?.voice?.channel;

      if (
        botVoiceChannel &&
        interaction.customId !== "refresh" &&
        interaction.commandName !== "info" &&
        interaction.member?.voice?.channel !== botVoiceChannel
      ) {
        utils.logInfo(
          `${interaction.user.username} is not in the same voice channel as bot`
        );
        return utils.printError(
          interaction,
          "Musisz być na tym samym kanale głosowym co bot!",
          null,
          true
        );
      }

      const collection = interaction.isCommand()
        ? client.slashcommands
        : client.buttoncommands;

      await collection
        .get(interaction.commandName || interaction.customId)
        .run({ client, interaction });
    } catch (err) {
      utils.logInfo(
        `${interaction.user.username} used ` +
          `/${interaction.commandName || interaction.customId} command`,
        err
      );
      if (interaction.channel && err.status !== 404) {
        return utils.printError(
          interaction.channel,
          "Wystąpił błąd podczas wykonywania komendy! " +
            "Spróbuj ponownie później.",
          err
        );
      }
    }
  }
};
