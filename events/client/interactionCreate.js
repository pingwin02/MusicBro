const { Events } = require("discord.js");
const { logInfo } = require("../../functions");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const user = interaction.author || interaction.user;
    const client = interaction.client;
    const channel = client.channels.cache.get(interaction.channelId) || null;

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
        (!channel.permissionsFor(client.user).has("SendMessages") ||
          !channel.permissionsFor(client.user).has("ViewChannel"))
      ) {
        return interaction.reply({
          content:
            ":x: Nie mam uprawnień do wysyłania wiadomości lub nie widzę tego kanału",
          ephemeral: true,
        });
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
      if (channel)
        await channel.send(`:x: Wystąpił nieoczekiwany błąd: \`${err}\``);
    }
  },
};
