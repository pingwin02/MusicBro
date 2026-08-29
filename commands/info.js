const {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder
} = require("discord.js");
const utils = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription(utils.t("commands.info.description")),
  run: async ({ client, interaction }) => {
    const ping = Math.max(Date.now() - interaction.createdTimestamp, 0);
    const apiPing = Math.max(client.ws.ping, 0);
    const uptime = utils.msToTime(client.uptime);
    const msg =
      `${utils.t("commands.info.ping", { ping })}\n` +
      `${utils.t("commands.info.api_ping", { apiPing })}\n` +
      `${utils.t("commands.info.uptime", { uptime })}\n` +
      utils.t("commands.info.created_by", {
        adminId: process.env.ADMIN_ID || ""
      });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            utils.t("commands.info.title", {
              username: client.user.username
            })
          )
          .setDescription(msg)
          .setColor("Random")
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
};
