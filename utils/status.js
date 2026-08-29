const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");
const {
  BUTTONS,
  DISCORD_API_ERROR_CODES,
  QUEUE_PAGE_SIZE
} = require("./constants");
const { buildEmbedWithButton } = require("./embeds");
const { t } = require("./i18n");
const { logInfo } = require("./logger");
const { handleLyrics } = require("./lyrics");

function createButton(id, queue, page = 0, total = 1) {
  const data = BUTTONS[id];
  const btn = new ButtonBuilder()
    .setCustomId(id)
    .setStyle(data.style || ButtonStyle.Primary);

  if (data.labelKey) btn.setLabel(t(data.labelKey));
  else if (data.label) btn.setLabel(data.label);
  if (data.emoji) btn.setEmoji(data.emoji);

  const isDisabled =
    typeof data.disabled === "function"
      ? data.disabled(queue, page, total)
      : false;
  return btn.setDisabled(isDisabled);
}

function buildDescription(queue, lyricsLines, page, perPage) {
  const bar = queue.node.createProgressBar({
    queue: false,
    length: 8,
    timecodes: true
  });
  const current = queue.currentTrack;
  if (!current) return;

  const lyricsBlock = lyricsLines
    .map((l) => l.replace(/\n/g, "").padEnd(49, " "))
    .join("\n\n");

  const requestedByText = current.requestedBy?.id
    ? `<@${current.requestedBy.id}>`
    : t("errors.track_fallback");

  const addedBy = t("status.added_by", { user: requestedByText });
  const author = t("status.author", { author: current.author });
  const lyricsHeader = t("status.lyrics");
  const progressHeader = t("status.progress");
  const queueHeader = t("status.queue_header");

  const desc =
    `[**${current.title}**](${current.url})\n` +
    `${author}\n` +
    `*${addedBy}*\n\n` +
    `**${lyricsHeader}**\n\`\`\`${lyricsBlock}\`\`\`\n` +
    `**${progressHeader}**\n${bar}\n\n**${queueHeader}**\n`;

  const tracks = queue.tracks
    .toArray()
    .slice(page * perPage, (page + 1) * perPage);
  return (
    desc +
    (tracks.length
      ? tracks
        .map(
          (s, i) =>
            `*${page * perPage + i + 1}*. **${s.title}** [${s.duration}]`
        )
        .join("\n")
      : `*${t("status.empty_queue")}*`)
  );
}

function buildStatusEmbed(queue, lyricsLines, page, perPage, totalPages) {
  const titleParts = [
    t("status.now_playing"),
    queue.node.isPaused() && `(:pause_button: ${t("status.paused")})`,
    queue.repeatMode === 1 && `(:repeat_one: ${t("status.repeat_track")})`,
    queue.repeatMode === 2 && `(:repeat: ${t("status.repeat_queue")})`
  ]
    .filter(Boolean)
    .join(" ");
  const description = buildDescription(queue, lyricsLines, page, perPage);
  if (!description) return;

  const pageStr =
    totalPages > 1
      ? ` | ${t("status.page_of", { page: page + 1, total: totalPages })}`
      : "";

  return new EmbedBuilder()
    .setTitle(titleParts)
    .setThumbnail(queue.currentTrack?.thumbnail)
    .setColor("Blue")
    .setFooter({
      text: `${t("status.volume", { volume: queue.node.volume })}${pageStr}`
    })
    .setDescription(description);
}

function buildActionRows(queue, page, totalPages) {
  const row1 = new ActionRowBuilder().addComponents(
    ...["resume", "pause", "stop", "skip"].map((id) => createButton(id, queue))
  );

  const row2 = new ActionRowBuilder().addComponents(
    ...["loopTrack", "loopQueue", "loopDisable", "shuffle"].map((id) =>
      createButton(id, queue)
    )
  );

  const rows = [row1, row2];

  if (totalPages > 1) {
    const row3 = new ActionRowBuilder().addComponents(
      createButton("previous", queue, page, totalPages),
      createButton("next", queue, page, totalPages)
    );
    rows.push(row3);
  }

  const row4 = new ActionRowBuilder().addComponents(
    createButton("refresh", queue)
  );
  rows.push(row4);

  return rows;
}

function getPaginationInfo(queue) {
  const perPage = QUEUE_PAGE_SIZE;
  const totalPages = Math.ceil(queue.getSize() / perPage) || 1;
  const page = Math.max(0, Math.min(queue.metadata.page || 0, totalPages - 1));
  return { perPage, totalPages, page };
}

async function handleLyricsOnChange(queue, lyricsLines) {
  queue.metadata.lastLyricsLines = lyricsLines;
  const { perPage, totalPages, page } = getPaginationInfo(queue);
  const embed = buildStatusEmbed(queue, lyricsLines, page, perPage, totalPages);
  const components = buildActionRows(queue, page, totalPages);

  try {
    await queue.metadata.statusMessage?.edit({ embeds: [embed], components });
  } catch (err) {
    if (
      err.code === DISCORD_API_ERROR_CODES.UNKNOWN_MESSAGE ||
      err.rawError?.code === DISCORD_API_ERROR_CODES.UNKNOWN_MESSAGE
    ) {
      queue.metadata.statusMessage = null;
      return;
    }
    logInfo("Live lyrics statusMessage edit", err);
  }
}

function runStatusSynchronized(queue, task) {
  const previous = queue.metadata.statusSync || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  queue.metadata.statusSync = current.catch(() => {});
  return current;
}

async function sendStatus(queue, fetchLyrics = false) {
  return runStatusSynchronized(queue, async () => {
    try {
      if (!queue?.currentTrack || queue.metadata.isEasterEgg) return;

      const { perPage, totalPages, page } = getPaginationInfo(queue);
      queue.metadata.page = page;
      const lyricsLines = queue.metadata.lastLyricsLines || [
        t("status.loading_lyrics")
      ];
      queue.metadata.lastLyricsLines = lyricsLines;

      const embed = buildStatusEmbed(
        queue,
        lyricsLines,
        page,
        perPage,
        totalPages
      );
      const components = buildActionRows(queue, page, totalPages);

      if (queue?.metadata?.statusMessage) {
        await queue.metadata.statusMessage.edit({
          embeds: [embed],
          components
        });
      } else if (queue?.metadata?.textChannel) {
        queue.metadata.statusMessage = await queue.metadata.textChannel.send({
          embeds: [embed],
          components
        });
      }

      if (fetchLyrics) {
        const result = await handleLyrics({
          queue,
          onChange: async (lyricsBuffer) =>
            await handleLyricsOnChange(queue, lyricsBuffer)
        });
        if (result) {
          queue.metadata.lastLyricsLines = result.lyrics
            ? [t("status.no_live_lyrics")]
            : [t("status.lyrics_coming_soon")];
        } else {
          queue.metadata.lastLyricsLines = [t("status.no_lyrics_found")];
        }
        if (!queue.metadata.statusMessage) return;
        const updatedEmbed = buildStatusEmbed(
          queue,
          queue.metadata.lastLyricsLines,
          page,
          perPage,
          totalPages
        );
        await queue.metadata.statusMessage.edit({
          embeds: [updatedEmbed],
          components
        });
      }
    } catch (err) {
      if (
        err.code === DISCORD_API_ERROR_CODES.UNKNOWN_MESSAGE ||
        err.rawError?.code === DISCORD_API_ERROR_CODES.UNKNOWN_MESSAGE
      ) {
        queue.metadata.statusMessage = null;
        return;
      }
      logInfo("sendStatus", err);
    }
  });
}

function canPlayTrack(track) {
  const status = track.raw?.playability_status?.status;
  const reason = track.raw?.playability_status?.reason || t("status.no_reason");

  if (!status || status === "OK") {
    return { success: true };
  }

  return {
    success: false,
    status: status,
    reason: reason
  };
}

async function sendLoadingStatus(queue) {
  return runStatusSynchronized(queue, async () => {
    try {
      if (queue.isEmpty() && !queue.currentTrack) return;

      const { embed, row } = buildEmbedWithButton({
        title: t("status.please_wait"),
        description: t("status.loading_track"),
        color: "Blue",
        thumbnail: "https://cdn-icons-png.flaticon.com/512/889/889843.png"
      });

      if (queue?.metadata?.statusMessage) {
        await queue.metadata.statusMessage.edit({
          embeds: [embed],
          components: [row]
        });
      } else if (queue?.metadata?.textChannel) {
        queue.metadata.statusMessage = await queue.metadata.textChannel.send({
          embeds: [embed],
          components: [row]
        });
      }
    } catch (err) {
      logInfo("sendLoadingStatus", err);
    }
  });
}

module.exports = {
  canPlayTrack,
  sendLoadingStatus,
  sendStatus
};
