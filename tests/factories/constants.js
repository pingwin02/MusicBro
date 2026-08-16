const TEST_IDS = {
  VIDEO_ID: "XXYlFuWEuKI",
  MIX_VIDEO_ID: "4NRXx6U8ABQ",
  PLAYLIST_ID: "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
  MOCK_GUILD_ID: "123456789012345678",
  MOCK_GUILD_ID_2: "123456789012345679",
  MOCK_USER_ID: "987654321098765432",
  EXTRACTOR_ID: "com.musicbro.youtube"
};

const TEST_URLS = {
  VIDEO_URL: `https://www.youtube.com/watch?v=${TEST_IDS.VIDEO_ID}`,
  VIDEO_SHORT_URL: `https://youtu.be/${TEST_IDS.VIDEO_ID}`,
  SHORTS_URL: `https://www.youtube.com/shorts/${TEST_IDS.VIDEO_ID}`,
  CANONICAL_VIDEO_URL: `https://youtube.com/watch?v=${TEST_IDS.VIDEO_ID}`,
  MIX_URL:
    `https://www.youtube.com/watch?v=${TEST_IDS.MIX_VIDEO_ID}&` +
    `list=RD${TEST_IDS.VIDEO_ID}&start_radio=1`,
  PLAYLIST_URL: `https://www.youtube.com/playlist?list=${TEST_IDS.PLAYLIST_ID}`,
  INVALID_URL: "arbitrary"
};

const TEST_QUERIES = {
  TRACK_QUERY: "The Weeknd",
  SEARCH_QUERY: "youtube: The Weeknd - Save Your Tears",
  YT_SEARCH_QUERY: "ytsearch: Never Gonna Give You Up",
  YT_PLAYLIST_QUERY: "ytplaylist: Top 50 Global Hits"
};

const TEST_ERRORS = {
  FORCE_AND_NEXT_CONFLICT:
    "Opcje `force` oraz `next` nie mogą być włączone jednocześnie!",
  VOICE_CHANNEL_REQUIRED: "Musisz być na kanale głosowym!"
};

module.exports = {
  TEST_IDS,
  TEST_URLS,
  TEST_QUERIES,
  TEST_ERRORS
};
