const { Events } = require("discord.js");
const { logCommandUse, logInfoDate } = require("../functions");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isCommand()) return;

    logCommandUse(interaction);

    const client = interaction.client;

    const channel = client.channels.cache.get(interaction.channelId);
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

    const slashcmd = client.slashcommands.get(interaction.commandName);
    if (!slashcmd)
      return interaction.reply(
        ":x: Wystąpił nieoczekiwany błąd: `Unknown Command`"
      );

    try {
      await slashcmd.run({ client, interaction });
    } catch (err) {
      logInfoDate(`/${interaction.commandName} command`, err);
      const msg = `:x: Wystąpił nieoczekiwany błąd: \`${err}\``;
      if (interaction.deferred || interaction.replied) {
        interaction.editReply(msg);
      } else {
        interaction.reply(msg);
      }
    }
  },
};
