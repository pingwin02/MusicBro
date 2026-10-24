const { useMainPlayer } = require("discord-player");
const {
  LYRICS_BUFFER_SIZE,
  LYRICS_MAX_RETRIES,
  LYRICS_QUERY_DELAY_MS,
  LYRICS_RETRY_DELAY_MS,
  LYRICS_USER_AGENT
} = require("./constants");
const { logInfo } = require("./logger");
const { sleep } = require("./time");

function parseTrackForLyrics(track) {
  if (!track) {
    return { title: "", author: "", cleanTitle: "", rawTitle: "" };
  }

  const rawTitle = track.title || "";
  const cleanedTitle = rawTitle
    .replace(/[([](?:(?!ft\.?|feat\.?|featuring)[^)\]])*[)\]]/gi, " ")
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
    .replace(/\s*[([]\s*(?:ft\.?|feat\.?|featuring)\b[^)\]]*[)\]]/gi, "")
    .replace(/\s*(?:ft\.?|feat\.?|featuring)\b.*$/i, "")
    .trim();

  return { title, author, cleanTitle, rawTitle };
}

function findBestLyricsMatch(
  results,
  { targetDuration, rawTitle, title, cleanTitle, author } = {}
) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const targetDurationSec =
    typeof targetDuration === "number" && targetDuration > 0
      ? targetDuration > 10000
        ? targetDuration / 1000
        : targetDuration
      : 0;

  const normalizedRaw = (rawTitle || "").toLowerCase();
  const normalizedTitle = (title || "").toLowerCase();
  const normalizedClean = (cleanTitle || "").toLowerCase();
  const normalizedAuthor = (author || "").toLowerCase();

  let bestResult = null;
  let bestScore = -Infinity;

  for (const item of results) {
    if (!item || (!item.plainLyrics && !item.syncedLyrics)) continue;

    let score = 0;

    if (item.syncedLyrics) {
      score += 100;
    }

    if (
      targetDurationSec > 0 &&
      typeof item.duration === "number" &&
      item.duration > 0
    ) {
      const diff = Math.abs(item.duration - targetDurationSec);
      if (diff <= 2) {
        score += 50;
      } else if (diff <= 5) {
        score += 30;
      } else if (diff <= 10) {
        score += 10;
      } else if (diff > 30) {
        score -= 40;
      }
    }

    const itemArtist = (item.artistName || "").toLowerCase();
    const itemTrack = (item.trackName || "").toLowerCase();

    if (normalizedAuthor && itemArtist.includes(normalizedAuthor)) {
      score += 20;
    }

    if (normalizedClean && itemTrack.includes(normalizedClean)) {
      score += 20;
    }

    const featuredMatch = (normalizedRaw || normalizedTitle).match(
      /(?:feat\.?|ft\.?|featuring)\s+([^()\]]+)/i
    );
    if (featuredMatch && featuredMatch[1]) {
      const featuredParts = featuredMatch[1]
        .split(/[&,]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      for (const part of featuredParts) {
        if (itemArtist.includes(part) || itemTrack.includes(part)) {
          score += 25;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = item;
    }
  }

  return bestResult;
}

function getHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  return headers[name] || headers[name.toLowerCase()] || null;
}

function parseRetryAfterHeader(header) {
  if (!header) return null;
  const raw = typeof header === "string" ? header.trim() : header;
  const seconds = Number(raw);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function setupLyricsClient(player) {
  if (!player?.lyrics || player.lyrics._customClientApplied) {
    return;
  }

  const bucket = player.lyrics.bucket;
  if (bucket && typeof bucket._request === "function") {
    const originalBucketRequest = bucket._request.bind(bucket);
    bucket._request = async function (req, retries = 0) {
      let lastRetryAfterMs = null;
      const wrappedReq = async () => {
        const res = await req();
        if (res && !res.ok) {
          const retryHeader = getHeader(res.headers, "retry-after");
          lastRetryAfterMs = parseRetryAfterHeader(retryHeader);
        }
        return res;
      };

      try {
        return await originalBucketRequest(wrappedReq, retries);
      } catch (err) {
        if (lastRetryAfterMs !== null) {
          err.retryAfterMs = lastRetryAfterMs;
        }
        throw err;
      }
    };
  }

  if (typeof player.lyrics.request === "function") {
    const originalRequest = player.lyrics.request.bind(player.lyrics);
    player.lyrics.request = (path, options = {}) =>
      originalRequest(path, {
        ...options,
        headers: {
          "User-Agent": LYRICS_USER_AGENT,
          ...options?.headers
        }
      });
  }

  player.lyrics._customClientApplied = true;
  player.lyrics._customUserAgentApplied = true;
}

function setupLyricsUserAgent(player) {
  return setupLyricsClient(player);
}

async function searchLyricsWithRetry(
  player,
  query,
  retryDelay = LYRICS_RETRY_DELAY_MS,
  maxRetries = LYRICS_MAX_RETRIES
) {
  setupLyricsClient(player);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await player.lyrics.search(query);
    } catch (err) {
      const isOverloaded =
        err?.name === "ServerOverloaded" ||
        /busy|overload|503/i.test(err?.message || "");
      if (isOverloaded && attempt < maxRetries) {
        const delay =
          typeof err?.retryAfterMs === "number" && err.retryAfterMs > 0
            ? err.retryAfterMs
            : retryDelay;
        const jitter = Math.floor(Math.random() * 200);
        await sleep(delay + jitter);
        continue;
      }
      throw err;
    }
  }
}

async function fetchTrackLyrics(player, track) {
  if (!track) return null;
  if (track._lyricsResult !== undefined) {
    return track._lyricsResult;
  }
  if (track._lyricsPromise) {
    return await track._lyricsPromise;
  }

  track._lyricsPromise = (async () => {
    try {
      const targetDuration = track.durationMS ? track.durationMS / 1000 : 0;
      const { title, author, cleanTitle, rawTitle } =
        parseTrackForLyrics(track);

      const queries = [];
      if (title && title !== cleanTitle && author) {
        queries.push({ q: `${author} ${title}` });
      }
      if (cleanTitle && author) {
        queries.push({ trackName: cleanTitle, artistName: author });
      } else if (cleanTitle) {
        queries.push({ trackName: cleanTitle });
      }
      if (
        queries.length === 0 &&
        rawTitle &&
        rawTitle !== `${author} - ${title}`
      ) {
        queries.push({ q: rawTitle });
      }

      const seen = new Set();
      const uniqueQueries = queries.filter((q) => {
        const key = JSON.stringify(q);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      let result = null;
      for (let i = 0; i < uniqueQueries.length; i++) {
        if (i > 0) {
          await sleep(LYRICS_QUERY_DELAY_MS);
        }
        const res = await searchLyricsWithRetry(player, uniqueQueries[i]);
        const match = findBestLyricsMatch(res, {
          targetDuration,
          rawTitle,
          title,
          cleanTitle,
          author
        });
        if (match) {
          if (match.syncedLyrics) {
            result = match;
            break;
          }
          if (!result) {
            result = match;
          }
        }
      }

      track._lyricsResult = result;
      return result;
    } catch (err) {
      const isOverloaded =
        err?.name === "ServerOverloaded" ||
        /busy|overload|503/i.test(err?.message || "");
      if (isOverloaded) {
        logInfo(
          `[LYRICS] Service busy, could not fetch lyrics for ${track.title}`
        );
      } else {
        logInfo(`[LYRICS] Error fetching lyrics for ${track.title}`, err);
      }
      track._lyricsResult = null;
      return null;
    } finally {
      track._lyricsPromise = null;
    }
  })();

  return await track._lyricsPromise;
}

function prefetchLyrics(track) {
  if (!track || track._lyricsResult !== undefined || track._lyricsPromise) {
    return;
  }
  try {
    const player = useMainPlayer();
    if (player) {
      fetchTrackLyrics(player, track).catch(() => {});
    }
  } catch {
    return;
  }
}

async function handleLyrics({ queue, onChange, searchString }) {
  if (!queue?.currentTrack && !searchString) return;

  const player = useMainPlayer();

  if (searchString) {
    let result;
    try {
      const searchResults = await searchLyricsWithRetry(player, {
        q: searchString
      });
      result = findBestLyricsMatch(searchResults, { rawTitle: searchString });
      if (!result) {
        const cleaned = searchString
          .replace(/[([].*?[)\]]/g, " ")
          .replace(/\\/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (cleaned && cleaned !== searchString) {
          await sleep(LYRICS_QUERY_DELAY_MS);
          const cleanedResults = await searchLyricsWithRetry(player, {
            q: cleaned
          });
          result = findBestLyricsMatch(cleanedResults, {
            rawTitle: searchString,
            cleanTitle: cleaned
          });
        }
      }
    } catch (err) {
      const isOverloaded =
        err?.name === "ServerOverloaded" ||
        /busy|overload|503/i.test(err?.message || "");
      if (isOverloaded) {
        logInfo(
          `[LYRICS] Service busy, could not fetch lyrics for "${searchString}"`
        );
      } else {
        logInfo(`[LYRICS] Error fetching lyrics for "${searchString}"`, err);
      }
      return false;
    }
    if (!result) {
      logInfo(`[LYRICS] Lyrics not found for "${searchString}"`);
      return false;
    }
    return {
      lyrics:
        result.plainLyrics ||
        (result.syncedLyrics
          ? result.syncedLyrics.replace(/\[\d+:\d+\.\d+\]/g, "").trim()
          : ""),
      title: result.trackName,
      author: result.artistName
    };
  }

  if (!queue?.currentTrack) return;

  const track = queue.currentTrack;
  const { title, author } = parseTrackForLyrics(track);

  let result;
  try {
    result = await fetchTrackLyrics(player, track);
  } catch (err) {
    const isOverloaded =
      err?.name === "ServerOverloaded" ||
      /busy|overload|503/i.test(err?.message || "");
    if (isOverloaded) {
      logInfo(
        `[LYRICS] Service busy, could not fetch lyrics for ${author} - ${title}`
      );
    } else {
      logInfo(`[LYRICS] Error fetching lyrics for ${author} - ${title}`, err);
    }
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

    const initialLines = entries
      .slice(0, LYRICS_BUFFER_SIZE)
      .map(([, text]) => text);

    return {
      synced: true,
      initialLines: initialLines.length > 0 ? initialLines : null
    };
  }

  return {
    lyrics:
      result.plainLyrics ||
      (result.syncedLyrics
        ? result.syncedLyrics.replace(/\[\d+:\d+\.\d+\]/g, "").trim()
        : ""),
    title: result.trackName,
    author: result.artistName
  };
}

module.exports = {
  fetchTrackLyrics,
  findBestLyricsMatch,
  handleLyrics,
  parseRetryAfterHeader,
  parseTrackForLyrics,
  prefetchLyrics,
  searchLyricsWithRetry,
  setupLyricsClient,
  setupLyricsUserAgent
};
