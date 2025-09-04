const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");
const { logInfo } = require("./logger");
const { useMainPlayer } = require("discord-player");

// Define all buttons used in the player UI
const BUTTONS = {
  resume: { emoji: "▶", disabled: (q) => q.node.isPlaying() },
  pause: { emoji: "⏸", disabled: (q) => q.node.isPaused() },
  stop: { emoji: "⏹" },
  skip: { emoji: "⏭", disabled: (q) => q.node.isPaused() },
  loopTrack: { emoji: "🔂", disabled: (q) => q.repeatMode === 1 },
  loopQueue: { emoji: "🔁", disabled: (q) => q.repeatMode === 2 },
  loopDisable: { emoji: "➡", disabled: (q) => q.repeatMode === 0 },
  shuffle: { emoji: "🔀" },
  previous: {
    label: "Poprzednia strona",
    style: ButtonStyle.Secondary,
    disabled: (_, page) => page === 0
  },
  next: {
    label: "Następna strona",
    style: ButtonStyle.Secondary,
    disabled: (_, page, total) => page === total - 1
  },
  refresh: { label: "Odśwież" }
};

/**
 * Create a button for the music controller
 * @param {string} id - Button ID
 * @param {Queue} queue - Current queue
 * @param {number} page - Current page (for pagination buttons)
 * @param {number} total - Total pages
 * @returns {ButtonBuilder}
 */
function createButton(id, queue, page = 0, total = 1) {
  const data = BUTTONS[id];
  const btn = new ButtonBuilder()
    .setCustomId(id)
    .setStyle(data.style || ButtonStyle.Primary);

  if (data.label) btn.setLabel(data.label);
  if (data.emoji) btn.setEmoji(data.emoji);

  const isDisabled =
    typeof data.disabled === "function"
      ? data.disabled(queue, page, total)
      : false;

  return btn.setDisabled(isDisabled);
}

/**
 * Build description text for the embed
 * Includes current track, lyrics line, progress bar and queue preview
 */
function buildDescription(queue, lyricsLine, page, perPage) {
  const bar = queue.node.createProgressBar({
    queue: false,
    length: 8,
    timecodes: true
  });
  const current = queue.currentTrack;
  if (!current) return;
  lyricsLine = lyricsLine.padEnd(49, " ");
  const desc =
    `[**${current.title}**](${current.url})\n` +
    `Autor **${current.author}**\n` +
    `*dodane przez <@${current.requestedBy.id}>*\n\n` +
    `**Tekst:**\n\`\`\`${lyricsLine}\`\`\`\n` +
    `**Postęp:**\n${bar}\n\n**Kolejka:**\n`;

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
      : "*Pusta*")
  );
}

/**
 * Build an embed showing the current music status
 * @returns {EmbedBuilder}
 */
function buildStatusEmbed(queue, lyricsLine, page, perPage, totalPages) {
  const titleParts = [
    "Teraz gra",
    queue.node.isPaused() && "(:pause_button: wstrzymane)",
    queue.repeatMode === 1 && "(:repeat_one: powtarzanie utworu)",
    queue.repeatMode === 2 && "(:repeat: powtarzanie całej kolejki)"
  ]
    .filter(Boolean)
    .join(" ");

  const description = buildDescription(queue, lyricsLine, page, perPage);
  if (!description) return;

  return new EmbedBuilder()
    .setTitle(titleParts)
    .setThumbnail(queue.currentTrack?.thumbnail)
    .setColor("Blue")
    .setFooter({
      text:
        `Głośność: ${queue.node.volume} ` +
        `| Strona: ${page + 1} z ${totalPages}`
    })
    .setDescription(description);
}

/**
 * Build action rows with music control buttons
 */
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

/**
 * Get pagination info for the queue
 * Returns perPage, totalPages, and current page index
 */
function getPaginationInfo(queue) {
  const perPage = 15;
  const totalPages = Math.ceil(queue.getSize() / perPage) || 1;
  const page = Math.max(0, Math.min(queue.metadata.page || 0, totalPages - 1));
  return { perPage, totalPages, page };
}

/**
 * Handle lyrics fetching (both static and synced/live lyrics)
 * If synced lyrics are found, sets up live updates with onChange
 */
async function handleLyrics({ queue, onChange, searchString }) {
  const player = useMainPlayer();
  let title, author;

  if (searchString) {
    const result = (await player.lyrics.search({ q: searchString }))[0];
    if (!result)
      return (
        logInfo(`[LYRICS] Lyrics not found for "${searchString}"`),
        false
      );
    return {
      lyrics: result.plainLyrics,
      title: result.trackName,
      author: result.artistName
    };
  }

  if (!queue?.currentTrack) return;

  title = queue.currentTrack.title
    .replace(/\s*[([].*?[)\]]\s*/g, "")
    .replace(/\*/g, "")
    .trim();
  author = queue.currentTrack.author;

  if (title.includes(" - ")) {
    [author, title] = title.split(" - ").map((s) => s.trim());
  }

  const result = (
    await player.lyrics.search({ trackName: title, artistName: author })
  )[0];
  if (!result)
    return (
      logInfo(`[LYRICS] Lyrics not found for ${author} - ${title}`),
      false
    );
  logInfo(
    `[LYRICS] Found ${result.syncedLyrics ? "live " : ""}` +
      `lyrics for ${author} - ${title}`
  );
  if (onChange && result.syncedLyrics) {
    const syncedLyrics = queue.syncedLyrics(result);
    syncedLyrics.onChange(onChange);
    const unsubscribe = syncedLyrics.subscribe();
    queue.metadata.unsubscribeLyrics = () => {
      logInfo(
        `[LYRICS] Unsubscribing from live lyrics updates: ${author} - ${title}`
      );
      unsubscribe();
      queue.metadata.unsubscribeLyrics = null;
    };
    return true;
  }

  return {
    lyrics: result.plainLyrics,
    title: result.trackName,
    author: result.artistName
  };
}

/**
 * Update embed when synced/live lyrics change
 */
async function handleLyricsOnChange(queue, lyrics) {
  queue.metadata.lastLyricsLine = lyrics;
  const { perPage, totalPages, page } = getPaginationInfo(queue);
  const embed = buildStatusEmbed(queue, lyrics, page, perPage, totalPages);
  const components = buildActionRows(queue, page, totalPages);

  try {
    await queue.metadata.statusMessage?.edit({ embeds: [embed], components });
  } catch (err) {
    logInfo("Live lyrics statusMessage edit", err);
  }
}

/**
 * Send or update the status embed and controls
 * Optionally fetch lyrics (static or live)
 */
async function sendStatus(queue, fetchLyrics = false) {
  if (!queue?.currentTrack) return;

  const { perPage, totalPages, page } = getPaginationInfo(queue);
  queue.metadata.page = page;
  const lyricsLine = queue.metadata.lastLyricsLine || "Ładowanie tekstu...";
  queue.metadata.lastLyricsLine = lyricsLine;

  const embed = buildStatusEmbed(queue, lyricsLine, page, perPage, totalPages);
  const components = buildActionRows(queue, page, totalPages);

  try {
    await queue.metadata.statusMessage.edit({ embeds: [embed], components });
  } catch {
    queue.metadata.statusMessage = await queue.metadata.textChannel.send({
      embeds: [embed],
      components
    });
  }

  if (fetchLyrics) {
    const result = await handleLyrics({
      queue,
      onChange: async (lyrics) => await handleLyricsOnChange(queue, lyrics)
    });
    if (result) {
      queue.metadata.lastLyricsLine = result.lyrics
        ? "Brak tekstu na żywo. Użyj /lyrics, aby zobaczyć tekst."
        : "Tekst utworu zaraz się pojawi...";
    } else {
      queue.metadata.lastLyricsLine = "Nie znaleziono tekstu.";
    }
  }
  if (!queue.metadata.statusMessage) return;
  const updatedEmbed = buildStatusEmbed(
    queue,
    queue.metadata.lastLyricsLine,
    page,
    perPage,
    totalPages
  );
  await queue.metadata.statusMessage.edit({
    embeds: [updatedEmbed],
    components
  });
}

module.exports = {
  sendStatus,
  handleLyrics
};
