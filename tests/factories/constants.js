const { t } = require("../../utils/i18n");

const TEST_IDS = {
  EXTRACTOR_ID: "com.musicbro.youtube",
  MIX_VIDEO_ID: "4NRXx6U8ABQ",
  NON_MUSIC_VIDEO_ID: "_joQEa-mB-w",
  PLAYLIST_ID: "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
  VIDEO_ID: "XXYlFuWEuKI"
};

const TEST_URLS = {
  CANONICAL_VIDEO_URL: `https://youtube.com/watch?v=${TEST_IDS.VIDEO_ID}`,
  INVALID_URL: "arbitrary",
  MIX_URL:
    `https://www.youtube.com/watch?v=${TEST_IDS.MIX_VIDEO_ID}&` +
    `list=RD${TEST_IDS.VIDEO_ID}&start_radio=1`,
  NON_MUSIC_VIDEO_URL:
    "https://www.youtube.com/watch?v=" + `${TEST_IDS.NON_MUSIC_VIDEO_ID}`,
  PLAYLIST_URL: `https://www.youtube.com/playlist?list=${TEST_IDS.PLAYLIST_ID}`,
  SHORTS_URL: `https://www.youtube.com/shorts/${TEST_IDS.VIDEO_ID}`,
  VIDEO_SHORT_URL: `https://youtu.be/${TEST_IDS.VIDEO_ID}`,
  VIDEO_URL: `https://www.youtube.com/watch?v=${TEST_IDS.VIDEO_ID}`
};

const TEST_QUERIES = {
  SEARCH_QUERY: "youtube: The Weeknd - Save Your Tears",
  TRACK_QUERY: "The Weeknd",
  YT_PLAYLIST_QUERY: "ytplaylist: Top 50 Global Hits",
  YT_SEARCH_QUERY: "ytsearch: Never Gonna Give You Up"
};

const TEST_ERRORS = {
  get FORCE_AND_NEXT_CONFLICT() {
    return t("commands.play.conflict");
  },
  get QUEUE_EMPTY() {
    return t("errors.queue_empty");
  },
  get VOICE_CHANNEL_REQUIRED() {
    return t("errors.voice_channel_required");
  }
};

module.exports = {
  TEST_ERRORS,
  TEST_IDS,
  TEST_QUERIES,
  TEST_URLS
};
