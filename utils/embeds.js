const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
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
    if (!interaction) return;
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

/**
 * Builds a standardized Discord embed accompanied by a "Close" button.
 * @param {Object} options - Configuration options for the embed and button.
 * @param {string} options.title - The title of the embed.
 * @param {string} options.description - The main text content of the embed.
 * @param {string|number} options.color - The color of the embed side bar.
 * @param {string|null} options.thumbnail
 * - Optional URL for the embed thumbnail.
 * @param {ButtonStyle} options.buttonStyle
 * - The visual style of the close button.
 * @returns {{ embed: EmbedBuilder, row: ActionRowBuilder }}
 * An object containing the built embed and the action row with the button.
 */
function buildEmbedWithButton({
  title,
  description,
  color = "Blue",
  thumbnail = null,
  buttonStyle = ButtonStyle.Secondary
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color);
  if (thumbnail) embed.setThumbnail(thumbnail);

  const button = new ButtonBuilder()
    .setCustomId("embedClose")
    .setLabel("Zamknij")
    .setStyle(buttonStyle);

  const row = new ActionRowBuilder().addComponents(button);
  return { embed, row };
}

module.exports = {
  printError,
  buildEmbedWithButton
};
