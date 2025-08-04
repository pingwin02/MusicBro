const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Wyświetla informacje o bocie"),
  run: async ({ client, interaction }) => {
    const ping = Math.max(Date.now() - interaction.createdTimestamp, 0);
    const apiPing = Math.max(client.ws.ping, 0);
    const uptime = utils.msToTime(client.uptime);
    const msg =
      `:ping_pong: Ping wynosi **${ping}ms**\n` +
      `:robot: Ping API wynosi **${apiPing}ms**\n` +
      `:clock1: Uptime wynosi **${uptime}**\n` +
      `Stworzony z :heart: przez <@${process.env.ADMIN_ID}>`;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Informacje o ${client.user.username}`)
          .setDescription(msg)
          .setColor("Random")
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
};
