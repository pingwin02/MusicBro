const fs = require("fs");
const { inspect } = require("util");
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  logInfo,
  logDebug,
  printError,
  sendStatus,
  msToTime,
  timedDelete,
  loadEvents,
};

/**
 * Logs information to the console and appends it to a log file.
 * @param {string} info - Information to log.
 * @param {Error} error - Error to log (optional)
 *
 * @returns {void}
 */
function logInfo(info, error = null) {
  var currentdate = new Date()
    .toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw",
    })
    .replace(",", "");

  var logMessage = `[${currentdate}] - `;

  if (error) {
    logMessage += `[ERROR] ${info}: ${inspect(error)}`;
  } else {
    logMessage += `[INFO] ${info}`;
  }

  console.log(logMessage);

  fs.appendFile("logs/log.log", `${logMessage}\n`, (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
    }
  });
}

/**
 * Logs debug information to the console and appends it to a debug file.
 * @param {string} info - Information to log.
 * @returns {void}
 */

function logDebug(info) {
  var currentdate = new Date()
    .toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw",
    })
    .replace(",", "");

  var logMessage = `[${currentdate}] - [DEBUG] ${info}`;

  console.debug(logMessage);

  fs.appendFile("logs/debug.log", `${logMessage}\n`, (err) => {
    if (err) {
      console.error("Error writing to debug file:", err);
    }
  });
}

/**
 * Sends embed with error message to the interaction channel,
 * then deletes it after 15s. If error is passed interaction must be a TextChannel.
 * @param {CommandInteraction | TextChannel} interaction - Interaction to reply to.
 * @param {string} description - Error message to send.
 * @param {Error} error - Error to log (optional)
 * @returns {void}
 */

async function printError(interaction, description, error = null) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(":x: Błąd")
      .setDescription(description)
      .setColor("Red");

    if (error) {
      embed.setFooter({ text: `${error}` });
    }

    let reply;

    if (interaction.replied || interaction.deferred) {
      reply = await interaction.followUp({ embeds: [embed] });
    } else if (!error) {
      reply = await interaction.reply({ embeds: [embed] });
    } else {
      const textChannel = interaction;
      reply = await textChannel.send({ embeds: [embed] });
    }

    if (!error) timedDelete(reply, 15000);
  } catch (err) {
    logInfo("printError", err);
  }
}

/**
 * Sends embed with status message to the interaction channel.
 * @param {Queue} queue - Queue to get info from.
 * @returns {void}
 * @async
 */

async function sendStatus(queue) {
  try {
    if (
      !queue ||
      !queue.metadata ||
      !queue.metadata.textChannel ||
      !queue.currentTrack
    )
      return;

    const howManyonPage = 15;
    const totalPages = Math.ceil(queue.getSize() / howManyonPage) || 1;
    const page =
      (queue.metadata.page || 0) > totalPages - 1
        ? totalPages - 1
        : queue.metadata.page || 0;
    queue.metadata.page = page;

    const bar = queue.node.createProgressBar({
      queue: false,
      length: 8,
      timecodes: true,
    });

    let description =
      `[**${queue.currentTrack.title}**](${queue.currentTrack.url})\n` +
      `Autor **${queue.currentTrack.author}**\n` +
      `*dodane przez <@${queue.currentTrack.requestedBy.id}>*\n\n` +
      `**Postęp:**\n${bar}` +
      `\n\n**Kolejka:**\n`;

    const status = new EmbedBuilder()
      .setTitle(
        "Teraz gra" +
          (queue.node.isPaused() ? " (:pause_button: wstrzymane)" : "") +
          (queue.repeatMode == 1 ? "\n(:repeat_one: powtarzanie utworu)" : "") +
          (queue.repeatMode == 2
            ? "\n(:repeat: powtarzanie całej kolejki)"
            : "")
      )
      .setThumbnail(queue.currentTrack.thumbnail)
      .setFooter({
        text:
          `Głośność: ${queue.node.volume} | ` +
          `Strona: ${page + 1} z ${totalPages}`,
      })
      .setColor("Blue");

    const resumeBtn = new ButtonBuilder()
      .setCustomId("resume")
      .setEmoji("▶")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.node.isPlaying());

    const pauseBtn = new ButtonBuilder()
      .setCustomId("pause")
      .setEmoji("⏸")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.node.isPaused());

    const stopBtn = new ButtonBuilder()
      .setCustomId("stop")
      .setEmoji("⏹")
      .setStyle(ButtonStyle.Primary);

    const skipBtn = new ButtonBuilder()
      .setCustomId("skip")
      .setEmoji("⏭")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.node.isPaused());

    const loopTrackBtn = new ButtonBuilder()
      .setCustomId("loopTrack")
      .setEmoji("🔂")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.repeatMode == 1);

    const loopQueueBtn = new ButtonBuilder()
      .setCustomId("loopQueue")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.repeatMode == 2);

    const disableLoopBtn = new ButtonBuilder()
      .setCustomId("loopDisable")
      .setEmoji("➡")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.repeatMode == 0);

    const shuffleBtn = new ButtonBuilder()
      .setCustomId("shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Primary);

    const previousBtn = new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("Poprzednia strona")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page == 0);

    const nextBtn = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Następna strona")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page == totalPages - 1);

    const refreshBtn = new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("Odśwież")
      .setStyle(ButtonStyle.Primary);

    const row1 = new ActionRowBuilder().addComponents(
      resumeBtn,
      pauseBtn,
      stopBtn,
      skipBtn
    );
    const row2 = new ActionRowBuilder().addComponents(
      loopTrackBtn,
      loopQueueBtn,
      disableLoopBtn,
      shuffleBtn
    );

    const row3 = new ActionRowBuilder().addComponents(previousBtn, nextBtn);

    const row4 = new ActionRowBuilder().addComponents(refreshBtn);

    if (queue.getSize() > 0) {
      const queueString = queue.tracks
        .toArray()
        .slice(page * howManyonPage, (page + 1) * howManyonPage)
        .map((song, i) => {
          return `*${page * howManyonPage + i + 1}*. **${song.title}** [${
            song.duration
          }]`;
        });
      description += `${queueString.join("\n")}`;
    } else {
      description += "*Pusta*";
    }

    status.setDescription(description);

    const embed = {
      embeds: [status],
      components: [row1, row2, row3, row4],
    };

    try {
      await queue.metadata.statusMessage.edit(embed);
    } catch (err) {
      if (queue.metadata.statusMessage) {
        logInfo("Editing statusMessage", err);
      }
      queue.metadata.statusMessage = await queue.metadata.textChannel
        .send(embed)
        .catch((err) => {
          logInfo("Sending statusMessage", err);
        });
    }
  } catch (err) {
    logInfo("sendStatus", err);
  }
}

/**
 * Converts a number of milliseconds to a human-readable time format.
 * @param {number} ms - Number of milliseconds to convert.
 * @returns {string} Human-readable time format.
 */
function msToTime(ms) {
  let seconds = (ms / 1000).toFixed(1);
  let minutes = (ms / (1000 * 60)).toFixed(1);
  let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " sekund";
  else if (minutes < 60) return minutes + " minut";
  else if (hours < 24) return hours + " godzin";
  else return days + " dni";
}

/**
 * Deletes a message after a specified timeout.
 * @param {Message} message - Message to delete.
 * @param {number} timeout - Timeout in milliseconds. (default: 3000)
 * @returns {void}
 */

function timedDelete(message, timeout = 3000) {
  setTimeout(async () => {
    try {
      await message.delete();
    } catch (err) {
      logInfo("timedDelete", err);
    }
  }, timeout);
}

/**
 * Loads all events from a folder.
 * @param {EventEmitter} receiver - Event receiver.
 * @param {string} folderPath - Path to the folder.
 * @returns {void}
 */
function loadEvents(receiver, folderPath) {
  const events = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of events) {
    const event = require(`${folderPath}/${file}`);
    if (event.once) {
      receiver.once(event.name, (...args) => event.execute(...args));
    } else {
      receiver.on(event.name, (...args) => event.execute(...args));
    }
  }
}
