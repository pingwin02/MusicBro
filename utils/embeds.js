const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");
const { logInfo } = require("./logger");
const { timedDelete } = require("./time");
const { useMainPlayer } = require("discord-player");

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
      logInfo("printError", Error(description));
    }

    let reply;
    if (interaction.replied || interaction.deferred) {
      reply = await interaction.followUp({
        embeds: [embed],
        ephemeral: ephemeral
      });
    } else if (!error) {
      reply = await interaction.reply({
        embeds: [embed],
        ephemeral: ephemeral
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
 * Sends embed with status message to the interaction channel.
 * @param {Queue} queue - Queue to get info from.
 * @returns {void}
 * @async
 */
async function sendStatus(queue) {
  try {
    if (!queue.currentTrack) return;
    const player = useMainPlayer();
    let lastLyricsLine = queue.metadata.lastLyricsLine || null;

    const howManyonPage = 15;
    const totalPages = Math.ceil(queue.getSize() / howManyonPage) || 1;
    let page = Math.max(0, Math.min(queue.metadata.page || 0, totalPages - 1));
    if (queue.getSize() < howManyonPage) page = 0;
    queue.metadata.page = page;

    function buildDescription(queue, lyricsLine, page, howManyonPage) {
      const bar = queue.node.createProgressBar({
        queue: false,
        length: 8,
        timecodes: true
      });

      let description =
        `[**${queue.currentTrack.title}**](${queue.currentTrack.url})\n` +
        `Autor **${queue.currentTrack.author}**\n` +
        `*dodane przez <@${queue.currentTrack.requestedBy.id}>*\n\n` +
        `**Tekst:**\n${lyricsLine || "_Brak dostępnych napisów_"}\n\n` +
        `**Postęp:**\n${bar}\n\n**Kolejka:**\n`;

      if (queue.getSize() > 0) {
        const queueString = queue.tracks
          .toArray()
          .slice(page * howManyonPage, (page + 1) * howManyonPage)
          .map((song, i) => {
            return (
              `*${page * howManyonPage + i + 1}*. ` +
              `**${song.title}** [${song.duration}]`
            );
          });
        description += queueString.join("\n");
      } else {
        description += "*Pusta*";
      }

      return description;
    }

    const description = buildDescription(
      queue,
      lastLyricsLine,
      page,
      howManyonPage
    );

    const status = new EmbedBuilder()
      .setTitle(
        "Teraz gra" +
          (queue.node.isPaused() ? " (:pause_button: wstrzymane)" : "") +
          (queue.repeatMode === 1
            ? "\n(:repeat_one: powtarzanie utworu)"
            : "") +
          (queue.repeatMode === 2
            ? "\n(:repeat: powtarzanie całej kolejki)"
            : "")
      )
      .setThumbnail(queue.currentTrack.thumbnail)
      .setFooter({
        text:
          `Głośność: ${queue.node.volume} ` +
          `| Strona: ${page + 1} z ${totalPages}`
      })
      .setColor("Blue")
      .setDescription(description);

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
      .setDisabled(queue.repeatMode === 1);

    const loopQueueBtn = new ButtonBuilder()
      .setCustomId("loopQueue")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.repeatMode === 2);

    const disableLoopBtn = new ButtonBuilder()
      .setCustomId("loopDisable")
      .setEmoji("➡")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(queue.repeatMode === 0);

    const shuffleBtn = new ButtonBuilder()
      .setCustomId("shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Primary);

    const previousBtn = new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("Poprzednia strona")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0);

    const nextBtn = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Następna strona")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages - 1);

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

    const embed = {
      embeds: [status],
      components: [row1, row2]
    };

    if (totalPages > 1) {
      embed.components.push(row3);
    }

    embed.components.push(row4);

    (async () => {
      try {
        let title = queue.currentTrack.title;
        let author = queue.currentTrack.author;
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          author = parts[0].trim();
          title = parts[1].trim();
        }
        const track = `${author} ${title}`;
        const results = await player.lyrics.search({
          trackName: track,
          artistName: author
        });
        const first = results[0];
        if (first && first.syncedLyrics) {
          const syncedLyrics = queue.syncedLyrics(first);
          syncedLyrics.onChange(async (lyrics, timestamp) => {
            queue.metadata.lastLyricsLine = lyrics;
            const updatedDescription = buildDescription(
              queue,
              lyrics,
              page,
              howManyonPage
            );
            status.setDescription(updatedDescription);
            try {
              await queue.metadata.statusMessage.edit({
                embeds: [status],
                components: embed.components
              });
            } catch (err) {
              logInfo("Live lyrics statusMessage edit", err);
            }
          });
          syncedLyrics.subscribe();
          lastLyricsLine = queue.metadata.lastLyricsLine;
        }
      } catch (err) {
        logInfo("Lyrics fetch error", err);
      }
    })();

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

module.exports = {
  printError,
  sendStatus
};
