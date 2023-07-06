const { Events } = require("discord.js");
const { logCommandUse } = require("../functions");

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

    await slashcmd.run({ client, interaction });
  },
};
