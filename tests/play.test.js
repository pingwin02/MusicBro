const assert = require("node:assert/strict");
const test = require("node:test");
const playCommand = require("../commands/play");
const {
  TEST_ERRORS,
  TEST_IDS,
  TEST_QUERIES,
  TEST_URLS,
  createMockInteraction,
  createMockQueue,
  createMockTrack,
  createMockTracks,
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
  "play command - metadata and options definition",
  { concurrency: true },
  () => {
    const json = playCommand.data.toJSON();
    assert.equal(json.name, "play");
    assert.equal(json.options.length, 5);

    const [queryOpt, mixOpt, nextOpt, forceOpt, modeOpt] = json.options;
    assert.equal(queryOpt.name, "query");
    assert.equal(queryOpt.required, true);

    assert.equal(mixOpt.name, "mix");
    assert.equal(mixOpt.required, false);

    assert.equal(nextOpt.name, "next");
    assert.equal(nextOpt.required, false);

    assert.equal(forceOpt.name, "force");
    assert.equal(forceOpt.required, false);

    assert.equal(modeOpt.name, "mode");
    assert.equal(modeOpt.required, false);
    assert.equal(modeOpt.choices.length, 2);
    assert.equal(modeOpt.choices[0].value, "music");
    assert.equal(modeOpt.choices[1].value, "general");
  }
);

test("play command - shorts url conversion", { concurrency: true }, () => {
  const converted = TEST_URLS.SHORTS_URL.replace("/shorts/", "/watch?v=");
  assert.equal(converted, TEST_URLS.VIDEO_URL);
});

test("play command - mix url generation", { concurrency: true }, () => {
  const videoId = TEST_URLS.VIDEO_URL.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )?.[1];
  assert.equal(videoId, TEST_IDS.VIDEO_ID);

  const mixUrl =
    "https://www.youtube.com/watch?" + `v=${videoId}&list=RD${videoId}`;
  assert.equal(
    mixUrl,
    "https://www.youtube.com/watch?" +
      `v=${TEST_IDS.VIDEO_ID}&list=RD${TEST_IDS.VIDEO_ID}`
  );
});

test(
  "discord-player queue - single track next insertion",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

    const initialTracks = createMockTracks(player, 3, "Track");
    const nextTrack = createMockTrack(player, { title: "Next Track" });

    queue.addTrack(initialTracks);
    assert.equal(queue.tracks.size, 3);
    assert.equal(queue.tracks.toArray()[0].title, "Track 1");

    queue.insertTrack(nextTrack, 0);
    assert.equal(queue.tracks.size, 4);
    assert.equal(queue.tracks.toArray()[0].title, "Next Track");
    assert.equal(queue.tracks.toArray()[1].title, "Track 1");
    assert.equal(queue.tracks.toArray()[2].title, "Track 2");
    assert.equal(queue.tracks.toArray()[3].title, "Track 3");

    queue.delete();
  }
);

test(
  "discord-player queue - playlist with next preserves order",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

    const existingTracks = createMockTracks(player, 2, "Existing");
    queue.addTrack(existingTracks);

    const playlistTracks = createMockTracks(player, 3, "Playlist");

    playlistTracks.forEach((track, index) => {
      queue.insertTrack(track, index);
    });

    const orderedTitles = queue.tracks.toArray().map((t) => t.title);
    assert.deepEqual(orderedTitles, [
      "Playlist 1",
      "Playlist 2",
      "Playlist 3",
      "Existing 1",
      "Existing 2"
    ]);

    queue.delete();
  }
);

test(
  "play command - validation catches force and next conflict",
  { concurrency: true },
  async () => {
    const mockInteraction = createMockInteraction({
      options: {
        force: true,
        next: true,
        query: TEST_QUERIES.TRACK_QUERY
      }
    });

    const mockClient = { user: { id: "bot" } };

    await playCommand.run({ client: mockClient, interaction: mockInteraction });

    assert.equal(
      mockInteraction.getCapturedError(),
      TEST_ERRORS.FORCE_AND_NEXT_CONFLICT
    );
  }
);

test(
  "play command - voice channel requirements",
  { concurrency: true },
  async () => {
    const mockInteraction = createMockInteraction({
      member: { voice: { channel: null } },
      options: {
        query: TEST_QUERIES.TRACK_QUERY
      }
    });

    const mockClient = { user: { id: "bot" } };

    await playCommand.run({ client: mockClient, interaction: mockInteraction });

    assert.equal(
      mockInteraction.getCapturedError(),
      TEST_ERRORS.VOICE_CHANNEL_REQUIRED
    );
  }
);
