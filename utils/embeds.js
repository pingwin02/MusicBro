const { EmbedBuilder, MessageFlags } = require("discord.js");
const { logInfo } = require("./logger");
const { timedDelete } = require("./time");

/**
 * Sends embed with error message to the interaction channel,
 * then deletes it after 15s. If error is passed,
 * interaction must be a TextChannel.
 * @param {CommandInteraction | TextChannel} interaction
 * - Interaction to reply to.
 * @param {string} description - Error message to send.
 * @param {Error} error - Error to log (optional)
 * @param {Boolean} ephemeral - If true, message
 * will be ephemeral (default: false)
 * @returns {void}
 */
async function printError(
  interaction,
  description,
  error = null,
  ephemeral = false
) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(":x: Błąd")
      .setDescription(description)
      .setColor("Red");

    if (error) {
      const footer =
        `${error.name || "Error"}: ` +
        `${error.message || error.response?.statusText} ` +
        `${error.status ? `(${error.status})` : ""}`;
      embed.setFooter({ text: footer });
    } else {
      logInfo("printError", description);
    }

    let reply;
    if (interaction.replied || interaction.deferred) {
      reply = await interaction.followUp({
        embeds: [embed],
        flags: ephemeral ? MessageFlags.Ephemeral : 0
      });
    } else if (!error) {
      reply = await interaction.reply({
        embeds: [embed],
        flags: ephemeral ? MessageFlags.Ephemeral : 0
      });
    } else {
      const textChannel = interaction;
      reply = await textChannel.send({ embeds: [embed] });
    }

    timedDelete(reply, 10000);
  } catch (err) {
    logInfo("printError", err);
  }
}

module.exports = {
  printError
};
