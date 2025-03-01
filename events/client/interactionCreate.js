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

      if (
        interaction.isButton() &&
        interaction.customId !== "refresh" &&
        interaction.member.voice.channel !==
          interaction.guild.members.me.voice.channel
      ) {
        utils.logInfo(
          `${interaction.user.username} is not in the same voice channel as bot`
        );
        return utils.printError(
          interaction,
          "Musisz być na kanale głosowym co bot, by móc sterować muzyką!",
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
