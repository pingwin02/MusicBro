const assert = require("node:assert/strict");
const test = require("node:test");
const utils = require("../utils");
const {
  createMockGuild,
  createMockInteraction,
  createMockTrack,
  createTestPlayer
} = require("./factories");

test("utils.time - msToTime formats timestamps accurately", () => {
  assert.equal(utils.msToTime(0), "0.0 sekund");
  assert.equal(utils.msToTime(65000), "1.1 minut");
  assert.equal(utils.msToTime(3665000), "1.0 godzin");
  assert.equal(utils.msToTime(90065000), "1.0 dni");
});

test("utils.time - sleep resolves after duration", async () => {
  const start = Date.now();
  await utils.sleep(50);
  assert.ok(Date.now() - start >= 40);
});

test("utils.embeds - buildEmbedWithButton constructs embed and button", () => {
  const { embed, row } = utils.buildEmbedWithButton({
    title: "Test Embed",
    description: "Sample Description",
    color: "Red",
    thumbnail: "https://example.com/icon.png"
  });

  assert.equal(embed.data.title, "Test Embed");
  assert.equal(embed.data.description, "Sample Description");
  assert.equal(embed.data.thumbnail?.url, "https://example.com/icon.png");
  assert.equal(row.components.length, 1);
  assert.equal(row.components[0].data.custom_id, "embedClose");
});

test("utils.embeds - printError handles interaction states", async () => {
  const deferredInteraction = {
    deferred: true,
    replied: false,
    editReply: async (data) => data
  };
  await utils.printError(deferredInteraction, "Deferred error");

  let edited = false;
  const repliedInteraction = {
    deferred: true,
    replied: true,
    editReply: async () => {
      edited = true;
    }
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
});

test("utils.queue - validateVoiceChannel checks permissions and state", () => {
  const client = { user: { id: "bot" } };

  const noVcInteraction = {
    member: { voice: { channel: null } },
    deferred: true,
    editReply: async () => {}
  };
  assert.equal(utils.validateVoiceChannel(client, noVcInteraction), null);

  const missingPermsInteraction = {
    member: {
      voice: {
        channel: {
          permissionsFor: () => ({
            has: (perm) => perm !== "Connect"
          }),
          full: false
        }
      }
    },
    deferred: true,
    editReply: async () => {}
  };
  assert.equal(
    utils.validateVoiceChannel(client, missingPermsInteraction),
    null
  );

  const fullVcInteraction = {
    member: {
      voice: {
        channel: {
          permissionsFor: () => ({ has: () => true }),
          full: true
        }
      }
    },
    deferred: true,
    editReply: async () => {}
  };
  assert.equal(utils.validateVoiceChannel(client, fullVcInteraction), null);

  const validVc = {
    permissionsFor: () => ({ has: () => true }),
    full: false
  };
  const validInteraction = {
    member: { voice: { channel: validVc } }
  };
  assert.equal(utils.validateVoiceChannel(client, validInteraction), validVc);
});

test("utils.queue - cleanTrackUrl converts shorts and handles strings", () => {
  assert.equal(
    utils.cleanTrackUrl("https://youtube.com/shorts/abc123xyz"),
    "https://youtube.com/watch?v=abc123xyz"
  );
  assert.equal(
    utils.cleanTrackUrl("https://youtube.com/watch?v=normalVideo"),
    "https://youtube.com/watch?v=normalVideo"
  );
  assert.equal(utils.cleanTrackUrl(12345), 12345);
});

test("utils.queue - toShortTrackUrl converts YouTube URLs to youtu.be", () => {
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
});

test("utils.queue - isPlayableTrack verifies track restrictions", async () => {
  const { player } = await createTestPlayer();

  const playableTrack = createMockTrack(player, {
    durationMS: 180000,
    raw: { ["playability_status"]: { status: "OK" } }
  });
  assert.equal(utils.isPlayableTrack(playableTrack), true);

  const unplayableTrack = createMockTrack(player, {
    durationMS: 180000,
    raw: {
      ["playability_status"]: {
        status: "UNPLAYABLE",
        reason: "Video unavailable"
      }
    }
  });
  assert.equal(utils.isPlayableTrack(unplayableTrack), false);

  const tooLongTrack = createMockTrack(player, {
    duration: "10:00",
    raw: { ["playability_status"]: { status: "OK" } }
  });
  assert.equal(utils.isPlayableTrack(tooLongTrack, 300000), false);
});

test("utils.queue - requireQueue and validateTrackNumber", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-utils-queue" });
  client.guilds.cache.set(guild.id, guild);

  const mockInteraction = createMockInteraction();
  assert.equal(utils.requireQueue(mockInteraction), null);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

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
});

test("utils.easterEgg - checkEasterEggs function is defined", () => {
  assert.equal(typeof utils.checkEasterEggs, "function");
});

test("utils.queue - formatFailedUrls and cleanupEmptyQueue", () => {
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
  assert.ok(formatted.includes("...i jeszcze 2 więcej"));

  let deleted = false;
  const mockQueue = {
    currentTrack: null,
    tracks: { size: 0 },
    delete: () => {
      deleted = true;
    }
  };
  utils.cleanupEmptyQueue(mockQueue);
  assert.equal(deleted, true);

  deleted = false;
  const activeQueue = {
    currentTrack: { title: "Playing" },
    tracks: { size: 0 },
    delete: () => {
      deleted = true;
    }
  };
  utils.cleanupEmptyQueue(activeQueue);
  assert.equal(deleted, false);
});

test("utils.constants - exports required constants", () => {
  assert.equal(typeof utils.MAX_TRACK_LENGTH_MS, "number");
  assert.equal(typeof utils.NO_RESULTS_MESSAGE, "string");
  assert.ok(utils.NO_RESULTS_MESSAGE.includes("Youtube"));
});
