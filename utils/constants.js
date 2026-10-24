const { ButtonStyle } = require("discord.js");

const BUTTONS = {
  resume: { emoji: "▶", disabled: (q) => !q.node.isPaused() },
  pause: { emoji: "⏸", disabled: (q) => q.node.isPaused() },
  stop: { emoji: "⏹" },
  skip: { emoji: "⏭", disabled: (q) => q.node.isPaused() },
  loopTrack: { emoji: "🔂", disabled: (q) => q.repeatMode === 1 },
  loopQueue: { emoji: "🔁", disabled: (q) => q.repeatMode === 2 },
  loopDisable: { emoji: "➡", disabled: (q) => q.repeatMode === 0 },
  shuffle: { emoji: "🔀" },
  previous: {
    labelKey: "buttons.previous",
    style: ButtonStyle.Secondary,
    disabled: (_, page) => page === 0
  },
  next: {
    labelKey: "buttons.next",
    style: ButtonStyle.Secondary,
    disabled: (_, page, total) => page === total - 1
  },
  refresh: { labelKey: "buttons.refresh" }
};

const DISCORD_API_ERROR_CODES = {
  INTERACTION_ALREADY_REPLIED: 40060,
  UNKNOWN_INTERACTION: 10062,
  UNKNOWN_MESSAGE: 10008
};

const HTTP_STATUS = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  OK: 200,
  PARTIAL_CONTENT: 206
};

const DURATION_DIGITS_REGEX = /^\d+:\d+(:\d+)?$/;
const DURATION_LABEL_REGEX =
  /(?:(\d+)\s+hours?)?[,\s]*(?:(\d+)\s+minutes?)?[,\s]*(?:(\d+)\s+seconds?)?/;
const LYRICS_BUFFER_SIZE = 5;
const LYRICS_MAX_RETRIES = 3;
const LYRICS_QUERY_DELAY_MS = 600;
const LYRICS_RETRY_DELAY_MS = 1000;
const LYRICS_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";
const MAX_PLAYLIST_TRACKS = 100;
const MAX_RELATED_TRACKS = 5;
const MAX_RETRY_ATTEMPTS = 5;
const MAX_SEARCH_RESULTS = 10;
const MAX_TRACK_LENGTH_MS = Number.MAX_SAFE_INTEGER;
const QUEUE_PAGE_SIZE = 10;
const YOUTUBE_DOMAIN_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//;
const YOUTUBE_PLAYLIST_REGEX = /[&?]list=([a-zA-Z0-9_-]+)/;
const YOUTUBE_SHORT_URL_REGEX = new RegExp(
  "(?:youtube\\.com\\/(?:watch\\?(?:.*&)?v=|shorts\\/)|" +
    "youtu\\.be\\/)([a-zA-Z0-9_-]{11})"
);
const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

module.exports = {
  BUTTONS,
  DISCORD_API_ERROR_CODES,
  DURATION_DIGITS_REGEX,
  DURATION_LABEL_REGEX,
  HTTP_STATUS,
  LYRICS_BUFFER_SIZE,
  LYRICS_MAX_RETRIES,
  LYRICS_QUERY_DELAY_MS,
  LYRICS_RETRY_DELAY_MS,
  LYRICS_USER_AGENT,
  MAX_PLAYLIST_TRACKS,
  MAX_RELATED_TRACKS,
  MAX_RETRY_ATTEMPTS,
  MAX_SEARCH_RESULTS,
  MAX_TRACK_LENGTH_MS,
  QUEUE_PAGE_SIZE,
  YOUTUBE_DOMAIN_REGEX,
  YOUTUBE_PLAYLIST_REGEX,
  YOUTUBE_SHORT_URL_REGEX,
  YOUTUBE_URL_REGEX
};
