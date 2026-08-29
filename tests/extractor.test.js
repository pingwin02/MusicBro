const assert = require("node:assert/strict");
const test = require("node:test");
const { createFFmpegStream } = require("discord-player");
const {
  TEST_IDS,
  TEST_QUERIES,
  TEST_URLS,
  createTestPlayer
} = require("./factories");

let extractor;
let player;

test.before(async () => {
  const setup = await createTestPlayer();
  player = setup.player;
  extractor = player.extractors.get(TEST_IDS.EXTRACTOR_ID);
});

function assertValidTrack(track) {
  assert.ok(track);
  assert.ok(track.title);
  assert.ok(track.url);
  assert.ok(track.duration);
  assert.notEqual(track.duration, "0:00");
}

function assertValidPlaylist(result) {
  assert.ok(result);
  assert.ok(result.hasPlaylist());
  assert.ok(result.playlist);
  assert.ok(result.playlist.title);
  assert.ok(result.playlist.tracks.length > 0);
}

async function assertValidStream(track) {
  const stream = await track.extractor.stream(track);
  assert.ok(stream);
  if (typeof stream === "string") {
    assert.ok(stream.startsWith("https://"));
  } else {
    assert.equal(typeof stream.pipe, "function");
  }
  return stream;
}

test(
  "YouTubeExtractor - initialization and registration",
  { concurrency: true },
  () => {
    assert.ok(extractor);
    assert.equal(extractor.identifier, TEST_IDS.EXTRACTOR_ID);
  }
);

test("YouTubeExtractor - query validation", { concurrency: true }, async () => {
  const validQueries = [
    TEST_URLS.VIDEO_URL,
    TEST_URLS.VIDEO_SHORT_URL,
    TEST_QUERIES.SEARCH_QUERY,
    TEST_QUERIES.YT_SEARCH_QUERY,
    "ytvideo: The Weeknd",
    "general: The Weeknd",
    TEST_URLS.PLAYLIST_URL,
    TEST_QUERIES.YT_PLAYLIST_QUERY,
    TEST_URLS.MIX_URL
  ];

  for (const query of validQueries) {
    assert.equal(await extractor.validate(query), true);
  }
  assert.equal(
    await extractor.validate(TEST_URLS.INVALID_URL, TEST_URLS.INVALID_URL),
    false
  );
});

test(
  "YouTubeExtractor - track search and metadata",
  { concurrency: true },
  async () => {
    const result = await player.search(TEST_QUERIES.SEARCH_QUERY);
    assert.ok(result?.tracks.length > 0);
    assertValidTrack(result.tracks[0]);
    assert.equal(result.tracks[0].source, "youtube");
  }
);

test(
  "YouTubeExtractor - general video search mode",
  { concurrency: true },
  async () => {
    const result = await player.search("ytvideo: The Weeknd - Blinding Lights");
    assert.ok(result?.tracks.length > 0);
    assertValidTrack(result.tracks[0]);
    assert.equal(result.tracks[0].source, "youtube");
  }
);

test(
  "YouTubeExtractor - direct video URL lookup",
  { concurrency: true },
  async () => {
    const result = await player.search(TEST_URLS.VIDEO_URL);
    assert.ok(result?.tracks.length > 0);
    assert.equal(result.tracks[0].url, TEST_URLS.CANONICAL_VIDEO_URL);
    assertValidTrack(result.tracks[0]);
  }
);

test(
  "YouTubeExtractor - non-music video stream",
  { concurrency: true },
  async () => {
    const result = await player.search(TEST_URLS.NON_MUSIC_VIDEO_URL);
    assert.ok(result?.tracks.length > 0);
    assertValidTrack(result.tracks[0]);

    const stream = await assertValidStream(result.tracks[0]);
    const transcoder = createFFmpegStream(stream, {
      fmt: "s16le",
      seek: 0
    });
    assert.ok(transcoder);

    const receivedChunk = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Stream chunk timeout"));
      }, 20000);

      transcoder.once("data", (chunk) => {
        clearTimeout(timeout);
        resolve(chunk);
      });

      transcoder.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    assert.ok(receivedChunk.length > 0);
    if (!transcoder.destroyed) {
      transcoder.destroy();
    }
  }
);

test(
  "YouTubeExtractor - mix and radio playlist URL resolution",
  { concurrency: true },
  async () => {
    const result = await player.search(TEST_URLS.MIX_URL);
    assertValidPlaylist(result);
    assertValidTrack(result.playlist.tracks[0]);
  }
);

test(
  "YouTubeExtractor - playlist search and extraction",
  { concurrency: true },
  async () => {
    const result = await player.search(TEST_URLS.PLAYLIST_URL);
    assertValidPlaylist(result);
    assertValidTrack(result.playlist.tracks[0]);
  }
);

test(
  "YouTubeExtractor - audio streaming and seek",
  { concurrency: true },
  async () => {
    const result = await player.search(TEST_QUERIES.SEARCH_QUERY);
    assert.ok(result.tracks.length > 0);

    const stream = await assertValidStream(result.tracks[0]);
    const transcoder = createFFmpegStream(stream, {
      fmt: "s16le",
      seek: 120
    });
    assert.ok(transcoder);

    const receivedChunk = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Stream chunk timeout"));
      }, 20000);

      transcoder.once("data", (chunk) => {
        clearTimeout(timeout);
        resolve(chunk);
      });

      transcoder.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    assert.ok(receivedChunk.length > 0);
    if (!transcoder.destroyed) {
      transcoder.destroy();
    }
  }
);
