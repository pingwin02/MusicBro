const fs = require("fs");
const { EmbedBuilder, Message } = require("discord.js");
const { Track } = require("discord-player");

const ERROR_TIMEOUT = 15000;
const INFO_TIMEOUT = 25000;
const QUEUE_TIMEOUT = 35000;

module.exports = {
  ERROR_TIMEOUT,
  INFO_TIMEOUT,
  QUEUE_TIMEOUT,
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
 * @param {integer} type - Type of information to log.
 *
 * type = 0: Command;
 * type = 1: Error;
 * type = 2: Info;
 *
 * @returns {void}
 */
function logInfoDate(info, type) {
  /**
   * @type {string}
   * @description Current date and time in ISO format without milliseconds.
   */
  const currentdate =
    new Date().toISOString().replace(/T/, " ").replace(/\..+/, "") + " UTC";

  var logMessage = `[${currentdate}] - `;

  switch (type) {
    case 0:
      logMessage += "[COMMAND] ";
      break;
    case 1:
      logMessage += "[ERROR] ";
      break;
    case 2:
      logMessage += "[INFO] ";
      break;
    default:
      logMessage += "[OTHER] ";
      break;
  }

  logMessage += info;

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

  let commandName = message.commandName;
  if (commandName === undefined) commandName = message.content;

  if (message.guild === null)
    logInfoDate(`${user.username} used ${commandName} command in DMs`, 0);
  else {
    logInfoDate(
      `${user.username} used ${commandName} command in #${message.channel.name} at ${message.guild.name}`,
      0
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
                logInfoDate(`printError: ${err}`, 1);
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
                logInfoDate(`printError: ${err}`, 1);
              }),
            ERROR_TIMEOUT
          );
        });
    }
  } catch (err) {
    logInfoDate(`printError: ${err}`, 1);
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
                logInfoDate(`printNowPlaying: ${err}`, 1);
              }),
            INFO_TIMEOUT
          );
        })
        .catch((err) => {
          logInfoDate(`printNowPlaying: ${err}`, 1);
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
                logInfoDate(`printNowPlaying: ${err}`, 1);
              }),
            INFO_TIMEOUT
          );
        })
        .catch((err) => {
          logInfoDate(`printNowPlaying: ${err}`, 1);
        });
    }
  } catch (err) {
    logInfoDate(`printNowPlaying: ${err}`, 1);
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
            logInfoDate(`printTrackInfo: ${err}`, 1);
          }),
        INFO_TIMEOUT
      );
    })
    .catch((err) => {
      logInfoDate(`printTrackInfo: ${err}`, 1);
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
            logInfoDate(`printInfo: ${err}`, 1);
          }),
        INFO_TIMEOUT
      );
    })
    .catch((err) => {
      logInfoDate(`printInfo: ${err}`, 1);
    });
}
