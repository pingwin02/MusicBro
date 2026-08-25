process.env.NODE_ENV = "test";

const { Player, Track } = require("discord-player");
const { Client, GatewayIntentBits } = require("discord.js");
const { Log } = require("youtubei.js");
const { YouTubeExtractor } = require("../../extractors");
const {
  TEST_ERRORS,
  TEST_IDS,
  TEST_QUERIES,
  TEST_URLS
} = require("./constants");

Log.setLevel(Log.Level.NONE);

function createMockTrack(player, overrides = {}) {
  const title = overrides.title || "Test Track";
  return new Track(player, {
    title,
    description: overrides.description || title,
    author: overrides.author || "Artist",
    url: overrides.url || `https://youtube.com/watch?v=${title}`,
    thumbnail: overrides.thumbnail || "https://example.com/thumb.jpg",
    duration: overrides.duration || "3:30",
    views: overrides.views || 1000,
    requestedBy: overrides.requestedBy || null,
    source: overrides.source || "youtube",
    ...overrides
  });
}

function createMockTracks(player, count = 3, prefix = "Track") {
  const tracks = [];
  for (let i = 1; i <= count; i++) {
    tracks.push(createMockTrack(player, { title: `${prefix} ${i}` }));
  }
  return tracks;
}

function createMockGuild(overrides = {}) {
  return {
    id: overrides.id || TEST_IDS.MOCK_GUILD_ID,
    name: overrides.name || "Mock Guild",
    ...overrides
  };
}

async function createTestPlayer(client = null) {
  const c =
    client ||
    new Client({
      intents: [GatewayIntentBits.GuildVoiceStates]
    });
  const player = new Player(c);
  await player.extractors.register(YouTubeExtractor, {});
  return { client: c, player };
}

function createMockInteraction(overrides = {}) {
  const optionsMap = overrides.options || {};
  let capturedError = null;

  const defaultMember = {
    voice: {
      channel: {
        full: false,
        permissionsFor: () => ({ has: () => true })
      }
    }
  };

  const interaction = {
    guildId: overrides.guild?.id || TEST_IDS.MOCK_GUILD_ID,
    deferred: overrides.deferred !== undefined ? overrides.deferred : true,
    replied: overrides.replied !== undefined ? overrides.replied : false,
    guild: overrides.guild || createMockGuild(),
    channel: overrides.channel || { send: async () => {} },
    deferReply: async () => {},
    member: overrides.member !== undefined ? overrides.member : defaultMember,
    options: {
      getString: (name) => optionsMap[name] || null,
      getInteger: (name) =>
        optionsMap[name] !== undefined ? optionsMap[name] : null,
      getBoolean: (name) => Boolean(optionsMap[name])
    },
    editReply: async ({ embeds }) => {
      capturedError = embeds?.[0]?.data?.description;
      return { delete: async () => {} };
    },
    deleteReply: async () => {},
    getCapturedError: () => capturedError
  };

  return interaction;
}

module.exports = {
  TEST_IDS,
  TEST_URLS,
  TEST_QUERIES,
  TEST_ERRORS,
  createMockTrack,
  createMockTracks,
  createMockGuild,
  createTestPlayer,
  createMockInteraction
};
