const { useMainPlayer } = require("discord-player");
const { LYRICS_BUFFER_SIZE } = require("./constants");
const { logInfo } = require("./logger");

function parseTrackForLyrics(track) {
  if (!track) {
    return { title: "", author: "", cleanTitle: "", rawTitle: "" };
  }

  const rawTitle = track.title || "";
  const cleanedTitle = rawTitle
    .replace(/[([].*?[)\]]/g, " ")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let author = (track.author || "")
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .trim();
  let title = cleanedTitle;

  if (cleanedTitle.includes(" - ")) {
    const separatorIndex = cleanedTitle.indexOf(" - ");
    author = cleanedTitle.slice(0, separatorIndex).trim();
    title = cleanedTitle.slice(separatorIndex + 3).trim();
  }

  const cleanTitle = title
    .replace(/\s*(?:ft\.?|feat\.?|featuring)\s+.*$/i, "")
    .trim();

  return { title, author, cleanTitle, rawTitle };
}

async function handleLyrics({ queue, onChange, searchString }) {
  if (!queue?.currentTrack && !searchString) return;

  const player = useMainPlayer();

  if (searchString) {
    let result = (await player.lyrics.search({ q: searchString }))[0];
    if (!result) {
      const cleaned = searchString
        .replace(/[([].*?[)\]]/g, " ")
        .replace(/\\/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned && cleaned !== searchString) {
        result = (await player.lyrics.search({ q: cleaned }))[0];
      }
    }
    if (!result) {
      logInfo(`[LYRICS] Lyrics not found for "${searchString}"`);
      return false;
    }
    return {
      lyrics: result.plainLyrics,
      title: result.trackName,
      author: result.artistName
    };
  }

  if (!queue?.currentTrack) return;

  const { title, author, cleanTitle, rawTitle } = parseTrackForLyrics(
    queue.currentTrack
  );

  const queries = [];
  if (cleanTitle && author) {
    queries.push({ trackName: cleanTitle, artistName: author });
  }
  if (title && title !== cleanTitle && author) {
    queries.push({ trackName: title, artistName: author });
  }
  if (author && cleanTitle) {
    queries.push({ q: `${author} ${cleanTitle}` });
  }
  if (author && title && title !== cleanTitle) {
    queries.push({ q: `${author} ${title}` });
  }
  if (rawTitle) {
    queries.push({ q: rawTitle });
  }
  if (cleanTitle) {
    queries.push({ trackName: cleanTitle });
  }

  const seen = new Set();
  const uniqueQueries = queries.filter((q) => {
    const key = JSON.stringify(q);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let result;
  try {
    for (const q of uniqueQueries) {
      const res = await player.lyrics.search(q);
      if (res?.length && (res[0].plainLyrics || res[0].syncedLyrics)) {
        result = res[0];
        break;
      }
    }
  } catch (err) {
    logInfo(`[LYRICS] Error fetching lyrics for ${author} - ${title}`, err);
    return false;
  }

  if (!result) {
    logInfo(`[LYRICS] Lyrics not found for ${author} - ${title}`);
    return false;
  }

  logInfo(
    `[LYRICS] Found ${result.syncedLyrics ? "live " : ""}` +
      `lyrics for ${author} - ${title}`
  );

  if (onChange && result.syncedLyrics) {
    const syncedLyrics = queue.syncedLyrics(result);

    let lastBufferEndTime = -1;
    const entries = Array.from(syncedLyrics.lyrics.entries()).filter(
      ([, text]) => text.trim() !== ""
    );

    const updateBuffer = (timestamp) => {
      const index = entries.findIndex(([time]) => time === timestamp);
      if (index === -1) return;

      const bufferEndTime =
        entries[
          Math.min(index + LYRICS_BUFFER_SIZE - 1, entries.length - 1)
        ][0];

      if (timestamp > lastBufferEndTime || queue.metadata.seeked) {
        queue.metadata.seeked = false;
        lastBufferEndTime = bufferEndTime;
        const nextLines = entries
          .slice(index, index + LYRICS_BUFFER_SIZE)
          .map(([, text]) => text);
        onChange(nextLines);
      }
    };

    syncedLyrics.onChange((line, timestamp) => {
      if (timestamp) updateBuffer(timestamp);
    });

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

module.exports = {
  handleLyrics,
  parseTrackForLyrics
};
