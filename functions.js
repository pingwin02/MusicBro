const fs = require("fs");
const { inspect } = require("util");
const { EmbedBuilder, Message } = require("discord.js");
const { Track } = require("discord-player");

const ERROR_TIMEOUT = 15000;
const INFO_TIMEOUT = 25000;

module.exports = {
  ERROR_TIMEOUT,
  INFO_TIMEOUT,
  logInfoDate,
  logDebug,
  logCommandUse,
  printError,
  printNowPlaying,
  printTrackInfo,
  printInfo,
};

/**
 * Logs information to the console and appends it to a log file.
 * @param {string} info - Information to log.
 * @param {Error} error - Error to log (optional)
 *
 * @returns {void}
 */
function logInfoDate(info, error = null) {
  /**
   * @type {string}
   * @description Current date and time in ISO format without milliseconds.
   */
  const currentdate =
    new Date().toISOString().replace(/T/, " ").replace(/\..+/, "") + " UTC";

  var logMessage = `[${currentdate}] - `;

  if (error) {
    logMessage += `[ERROR] ${info}: ${inspect(error, {
      breakLength: 80,
      showHidden: true,
      depth: 0,
    })}`;
  } else {
    logMessage += `[INFO] ${info}`;
  }

  fs.appendFile("logs/log.log", `${logMessage}\n`, (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
    }
  });

  console.log(logMessage);
}

/**
 * Logs debug information to the console and appends it to a debug file.
 * @param {string} info - Information to log.
 * @returns {void}
 */

function logDebug(info) {
  fs.appendFile("logs/debug.log", `${info}\n`, (err) => {
    if (err) {
      console.error("Error writing to debug file:", err);
    }
  });
}

/**
 * Logs debug information about usage of slash commands.
 * @param {Message} message - Message to log.
 * @returns {void}
 */

function logCommandUse(message) {
  let user = message.author;
  if (message.author === undefined) user = message.user;

  let commandName = message;

  if (message.guild === null)
    logInfoDate(`${user.username} used ${commandName} in DMs`);
  else {
    logInfoDate(
      `${user.username} used ${commandName} in #${message.channel.name} at ${message.guild.name}`
    );
  }
}

/**
 * Sends embed with error message to the interaction channel,
 * then deletes it after ERROR_TIMEOUT.
 * @param {CommandInteraction} interaction - Interaction to reply to.
 * @param {string} error - Error message.
 * @param {boolean} followUp - Whether to use followUp or editReply.
 * @returns {void}
 */

function printError(interaction, error, followUp = false) {
  try {
    if (followUp) {
      return interaction
        .followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(":x: Błąd!")
              .setDescription(error)
              .setColor("Red"),
          ],
        })
        .then((msg) => {
          setTimeout(
            () =>
              msg.delete().catch((err) => {
                logInfoDate("printError", err);
              }),
            ERROR_TIMEOUT
          );
        });
    } else {
      return interaction
        .editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(":x: Błąd!")
              .setDescription(error)
              .setColor("Red"),
          ],
        })
        .then((msg) => {
          setTimeout(
            () =>
              msg.delete().catch((err) => {
                logInfoDate("printError", err);
              }),
            ERROR_TIMEOUT
          );
        });
    }
  } catch (err) {
    logInfoDate("printError", err);
  }
}

/**
 * Sends embed with now playing track info to the interaction channel,
 * then deletes it after INFO_TIMEOUT.
 * @param {CommandInteraction} interaction - Interaction to reply to.
 * @param {Queue} queue - Queue to get track info from.
 * @param {boolean} reply - If true, reply to interaction.
 * @returns {void}
 */

function printNowPlaying(interaction, queue, reply = false) {
  try {
    let bar = queue.node.createProgressBar({
      queue: false,
      length: 19,
      timecodes: true,
    });

    let embed = new EmbedBuilder()
      .setTitle(
        "Teraz gra" +
          (queue.repeatMode == 1 ? " (:repeat_one: powtarzanie utworu)" : "") +
          (queue.repeatMode == 2
            ? " (:repeat: powtarzanie całej kolejki)"
            : "") +
          (queue.node.isPaused() ? "\n(:pause_button: wstrzymane)" : "")
      )
      .setDescription(
        `[**${queue.currentTrack.title}**](${queue.currentTrack.url})\n Autor **${queue.currentTrack.author}**\n *dodane przez <@${queue.currentTrack.requestedBy.id}>* \n\n**Postęp:**\n${bar} `
      )
      .setThumbnail(queue.currentTrack.thumbnail)
      .setFooter({ text: `Głośność: ${queue.node.volume}` })
      .setColor("Blue");

    if (!reply) {
      interaction
        .send({
          embeds: [embed],
        })
        .then((msg) => {
          setTimeout(
            () =>
              msg.delete().catch((err) => {
                logInfoDate("printNowPlaying", err);
              }),
            INFO_TIMEOUT
          );
        })
        .catch((err) => {
          logInfoDate("printNowPlaying", err);
        });
    } else {
      interaction
        .editReply({
          embeds: [embed],
        })
        .then((msg) => {
          setTimeout(
            () =>
              msg.delete().catch((err) => {
                logInfoDate("printNowPlaying", err);
              }),
            INFO_TIMEOUT
          );
        })
        .catch((err) => {
          logInfoDate("printNowPlaying", err);
        });
    }
  } catch (err) {
    logInfoDate("printNowPlaying", err);
  }
}

/**
 * Sends embed with track info to the interaction channel,
 * then deletes it after INFO_TIMEOUT.
 * @param {CommandInteraction} interaction - Interaction to reply to.
 * @param {Track} track - Track to get info from.
 * @param {string} title - Embed title.
 * @param {string} description - Embed description.
 * @returns {void}
 */
function printTrackInfo(interaction, track, title, description) {
  return interaction
    .editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description + " :musical_note:")
          .setThumbnail(track.thumbnail)
          .setFooter({ text: `Przez ${track.requestedBy.username}` })
          .setColor("Yellow"),
      ],
    })
    .then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            logInfoDate("printTrackInfo", err);
          }),
        INFO_TIMEOUT
      );
    })
    .catch((err) => {
      logInfoDate("printTrackInfo", err);
    });
}

/**
 * Sends embed with info to the interaction channel,
 * then deletes it after INFO_TIMEOUT.
 * @param {CommandInteraction} interaction - Interaction to reply to.
 * @param {string} title - Embed title.
 * @param {string} description - Embed description.
 * @returns {void}
 */
function printInfo(interaction, title, description) {
  return interaction
    .editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description + " :musical_note:")
          .setFooter({ text: `Przez ${interaction.user.username}` })
          .setColor("Green"),
      ],
    })
    .then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            logInfoDate("printInfo", err);
          }),
        INFO_TIMEOUT
      );
    })
    .catch((err) => {
      logInfoDate("printInfo", err);
    });
}
