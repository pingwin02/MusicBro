const assert = require("node:assert/strict");
const test = require("node:test");
const utils = require("../utils");
const {
  createMockInteraction,
  createMockQueue,
  createMockTrack,
  createTestPlayer
} = require("./factories");

let client;
let player;

test.before(async () => {
  const setup = await createTestPlayer();
  client = setup.client;
  player = setup.player;
});

test(
  "utils.time - msToTime formats timestamps accurately",
  { concurrency: true },
  () => {
    assert.equal(utils.msToTime(0), `0.0 ${utils.t("time.seconds")}`);
    assert.equal(utils.msToTime(65000), `1.1 ${utils.t("time.minutes")}`);
    assert.equal(utils.msToTime(3665000), `1.0 ${utils.t("time.hours")}`);
    assert.equal(utils.msToTime(90065000), `1.0 ${utils.t("time.days")}`);
  }
);

test(
  "utils.time - sleep resolves after duration",
  { concurrency: true },
  async () => {
    const start = Date.now();
    await utils.sleep(50);
    assert.ok(Date.now() - start >= 40);
  }
);

test(
  "utils.embeds - buildEmbedWithButton constructs embed and button",
  { concurrency: true },
  () => {
    const { embed, row } = utils.buildEmbedWithButton({
      color: "Red",
      description: "Sample Description",
      thumbnail: "https://example.com/icon.png",
      title: "Test Embed"
    });

    assert.equal(embed.data.title, "Test Embed");
    assert.equal(embed.data.description, "Sample Description");
    assert.equal(embed.data.thumbnail?.url, "https://example.com/icon.png");
    assert.equal(row.components.length, 1);
    assert.equal(row.components[0].data.custom_id, "embedClose");
  }
);

test(
  "utils.embeds - printError handles interaction states",
  { concurrency: true },
  async () => {
    const deferredInteraction = {
      deferred: true,
      editReply: async (data) => data,
      replied: false
    };
    await utils.printError(deferredInteraction, "Deferred error");

    let edited = false;
    const repliedInteraction = {
      deferred: true,
      editReply: async () => {
        edited = true;
      },
      replied: true
    };
    await utils.printError(repliedInteraction, "Replied error");
    assert.equal(edited, true);

    let directlyReplied = false;
    const directInteraction = {
      deferred: false,
      replied: false,
      reply: async () => {
        directlyReplied = true;
      }
    };
    await utils.printError(directInteraction, "Direct error");
    assert.equal(directlyReplied, true);

    let channelSent = false;
    const textChannel = {
      send: async () => {
        channelSent = true;
        return { delete: async () => {} };
      }
    };
    await utils.printError(
      textChannel,
      "Channel error",
      new Error("Sample Error")
    );
    assert.equal(channelSent, true);
  }
);

test(
  "utils.queue - validateVoiceChannel checks permissions and state",
  { concurrency: true },
  () => {
    const mockClient = { user: { id: "bot" } };

    const noVcInteraction = {
      deferred: true,
      editReply: async () => {},
      member: { voice: { channel: null } }
    };
    assert.equal(utils.validateVoiceChannel(mockClient, noVcInteraction), null);

    const missingPermsInteraction = {
      deferred: true,
      editReply: async () => {},
      member: {
        voice: {
          channel: {
            full: false,
            permissionsFor: () => ({
              has: (perm) => perm !== "Connect"
            })
          }
        }
      }
    };
    assert.equal(
      utils.validateVoiceChannel(mockClient, missingPermsInteraction),
      null
    );

    const fullVcInteraction = {
      deferred: true,
      editReply: async () => {},
      member: {
        voice: {
          channel: {
            full: true,
            permissionsFor: () => ({ has: () => true })
          }
        }
      }
    };
    assert.equal(
      utils.validateVoiceChannel(mockClient, fullVcInteraction),
      null
    );

    const validVc = {
      full: false,
      permissionsFor: () => ({ has: () => true })
    };
    const validInteraction = {
      member: { voice: { channel: validVc } }
    };
    assert.equal(
      utils.validateVoiceChannel(mockClient, validInteraction),
      validVc
    );
  }
);

test(
  "utils.queue - cleanTrackUrl converts shorts and handles strings",
  { concurrency: true },
  () => {
    assert.equal(
      utils.cleanTrackUrl("https://youtube.com/shorts/abc123xyz"),
      "https://youtube.com/watch?v=abc123xyz"
    );
    assert.equal(
      utils.cleanTrackUrl("https://youtube.com/watch?v=normalVideo"),
      "https://youtube.com/watch?v=normalVideo"
    );
    assert.equal(utils.cleanTrackUrl(12345), 12345);
  }
);

test(
  "utils.queue - toShortTrackUrl converts YouTube URLs to youtu.be",
  { concurrency: true },
  () => {
    assert.equal(
      utils.toShortTrackUrl("https://youtube.com/watch?v=11111111111"),
      "https://youtu.be/11111111111"
    );
    assert.equal(
      utils.toShortTrackUrl(
        "https://www.youtube.com/watch?feature=shared&v=11111111111"
      ),
      "https://youtu.be/11111111111"
    );
    assert.equal(
      utils.toShortTrackUrl("https://youtube.com/shorts/11111111111"),
      "https://youtu.be/11111111111"
    );
    assert.equal(
      utils.toShortTrackUrl("https://music.youtube.com/watch?v=11111111111"),
      "https://youtu.be/11111111111"
    );
    assert.equal(
      utils.toShortTrackUrl("https://youtu.be/11111111111?si=test"),
      "https://youtu.be/11111111111"
    );
    assert.equal(
      utils.toShortTrackUrl("https://spotify.com/track/123"),
      "https://spotify.com/track/123"
    );
    assert.equal(utils.toShortTrackUrl(12345), 12345);
  }
);

test(
  "utils.queue - isPlayableTrack verifies track restrictions",
  { concurrency: true },
  () => {
    const playableTrack = createMockTrack(player, {
      durationMS: 180000,
      raw: { ["playability_status"]: { status: "OK" } }
    });
    assert.equal(utils.isPlayableTrack(playableTrack), true);

    const unplayableTrack = createMockTrack(player, {
      durationMS: 180000,
      raw: {
        ["playability_status"]: {
          reason: "Video unavailable",
          status: "UNPLAYABLE"
        }
      }
    });
    assert.equal(utils.isPlayableTrack(unplayableTrack), false);

    const tooLongTrack = createMockTrack(player, {
      duration: "10:00",
      raw: { ["playability_status"]: { status: "OK" } }
    });
    assert.equal(utils.isPlayableTrack(tooLongTrack, 300000), false);
  }
);

test(
  "utils.queue - requireQueue and validateTrackNumber",
  { concurrency: true },
  () => {
    const { guild, queue } = createMockQueue(player, client);

    const mockInteraction = createMockInteraction();
    assert.equal(utils.requireQueue(mockInteraction), null);

    const mockInteractionActive = createMockInteraction({ guild });
    mockInteractionActive.guildId = guild.id;
    assert.equal(
      utils.requireQueue(mockInteractionActive, { checkEmpty: true }),
      null
    );

    queue.addTrack([createMockTrack(player, { title: "Track 1" })]);
    assert.equal(
      utils.requireQueue(mockInteractionActive, { checkEmpty: true }),
      queue
    );

    assert.equal(
      utils.validateTrackNumber(mockInteractionActive, queue, 1),
      true
    );
    assert.equal(
      utils.validateTrackNumber(mockInteractionActive, queue, 10),
      false
    );

    queue.delete();
  }
);

test(
  "utils.easterEgg - checkEasterEggs function is defined",
  { concurrency: true },
  () => {
    assert.equal(typeof utils.checkEasterEggs, "function");
  }
);

test(
  "utils.queue - formatFailedUrls and cleanupEmptyQueue",
  { concurrency: true },
  () => {
    const shortList = ["https://youtube.com/watch?v=1"];
    assert.equal(
      utils.formatFailedUrls(shortList),
      "• https://youtube.com/watch?v=1"
    );

    const longList = Array.from(
      { length: 12 },
      (_, i) => `https://youtube.com/watch?v=${i}`
    );
    const formatted = utils.formatFailedUrls(longList);
    assert.ok(formatted.includes("• https://youtube.com/watch?v=0"));
    assert.ok(formatted.includes(utils.t("errors.more_failed", { count: 2 })));

    let deleted = false;
    const mockQueue = {
      currentTrack: null,
      delete: () => {
        deleted = true;
      },
      tracks: { size: 0 }
    };
    utils.cleanupEmptyQueue(mockQueue);
    assert.equal(deleted, true);

    deleted = false;
    const activeQueue = {
      currentTrack: { title: "Playing" },
      delete: () => {
        deleted = true;
      },
      tracks: { size: 0 }
    };
    utils.cleanupEmptyQueue(activeQueue);
    assert.equal(deleted, false);
  }
);

test(
  "utils.constants & i18n - exports required constants and helpers",
  { concurrency: true },
  () => {
    assert.equal(typeof utils.MAX_TRACK_LENGTH_MS, "number");
    assert.equal(typeof utils.t, "function");
    assert.equal(typeof utils.getLocale, "function");
    assert.equal(typeof utils.setLocale, "function");
    assert.ok(utils.t("errors.no_results").includes("Youtube"));
    assert.equal(typeof utils.BUTTONS, "object");
    assert.equal(typeof utils.LYRICS_BUFFER_SIZE, "number");
    assert.equal(typeof utils.MAX_PLAYLIST_TRACKS, "number");
    assert.equal(typeof utils.MAX_RELATED_TRACKS, "number");
    assert.equal(typeof utils.MAX_RETRY_ATTEMPTS, "number");
    assert.equal(typeof utils.MAX_SEARCH_RESULTS, "number");
    assert.equal(typeof utils.DISCORD_API_ERROR_CODES, "object");
    assert.equal(utils.DISCORD_API_ERROR_CODES.UNKNOWN_MESSAGE, 10008);
    assert.equal(typeof utils.HTTP_STATUS, "object");
    assert.equal(utils.HTTP_STATUS.OK, 200);
    assert.equal(utils.HTTP_STATUS.PARTIAL_CONTENT, 206);
    assert.equal(utils.HTTP_STATUS.FORBIDDEN, 403);
    assert.equal(utils.HTTP_STATUS.NOT_FOUND, 404);
    assert.ok(utils.DURATION_DIGITS_REGEX instanceof RegExp);
    assert.ok(utils.DURATION_LABEL_REGEX instanceof RegExp);
    assert.ok(utils.YOUTUBE_DOMAIN_REGEX instanceof RegExp);
    assert.ok(utils.YOUTUBE_PLAYLIST_REGEX instanceof RegExp);
    assert.ok(utils.YOUTUBE_SHORT_URL_REGEX instanceof RegExp);
    assert.ok(utils.YOUTUBE_URL_REGEX instanceof RegExp);
  }
);
