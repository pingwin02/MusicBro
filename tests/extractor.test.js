const assert = require("node:assert/strict");
const test = require("node:test");
const { createFFmpegStream } = require("discord-player");
const {
  TEST_IDS,
  TEST_QUERIES,
  TEST_URLS,
  createTestPlayer
} = require("./factories");

test("YouTubeExtractor - initialization and registration", async () => {
  const { player } = await createTestPlayer();

  const extractor = player.extractors.get(TEST_IDS.EXTRACTOR_ID);
  assert.ok(extractor);
  assert.equal(extractor.identifier, TEST_IDS.EXTRACTOR_ID);
});

test("YouTubeExtractor - query validation", async () => {
  const { player } = await createTestPlayer();
  const extractor = player.extractors.get(TEST_IDS.EXTRACTOR_ID);

  assert.equal(await extractor.validate(TEST_URLS.VIDEO_URL), true);
  assert.equal(await extractor.validate(TEST_URLS.VIDEO_SHORT_URL), true);
  assert.equal(await extractor.validate(TEST_QUERIES.SEARCH_QUERY), true);
  assert.equal(await extractor.validate(TEST_QUERIES.YT_SEARCH_QUERY), true);
  assert.equal(await extractor.validate(TEST_URLS.PLAYLIST_URL), true);
  assert.equal(await extractor.validate(TEST_QUERIES.YT_PLAYLIST_QUERY), true);
  assert.equal(await extractor.validate(TEST_URLS.MIX_URL), true);
  assert.equal(
    await extractor.validate(TEST_URLS.INVALID_URL, TEST_URLS.INVALID_URL),
    false
  );
});

test("YouTubeExtractor - track search and metadata", async () => {
  const { player } = await createTestPlayer();

  const result = await player.search(TEST_QUERIES.SEARCH_QUERY);
  assert.ok(result);
  assert.ok(result.tracks.length > 0);

  const track = result.tracks[0];
  assert.ok(track.title);
  assert.ok(track.url);
  assert.ok(track.duration);
  assert.notEqual(track.duration, "0:00");
  assert.equal(track.source, "youtube");
});

test("YouTubeExtractor - direct video URL lookup", async () => {
  const { player } = await createTestPlayer();

  const result = await player.search(TEST_URLS.VIDEO_URL);
  assert.ok(result);
  assert.ok(result.tracks.length > 0);

  const track = result.tracks[0];
  assert.equal(track.url, TEST_URLS.CANONICAL_VIDEO_URL);
  assert.ok(track.title);
  assert.ok(track.duration);
  assert.notEqual(track.duration, "0:00");
});

test("YouTubeExtractor - mix and radio playlist URL resolution", async () => {
  const { player } = await createTestPlayer();

  const result = await player.search(TEST_URLS.MIX_URL);
  assert.ok(result);
  assert.ok(result.hasPlaylist());
  assert.ok(result.playlist);
  assert.ok(result.playlist.title);
  assert.ok(result.playlist.tracks.length > 0);

  const track = result.playlist.tracks[0];
  assert.ok(track.title);
  assert.ok(track.url);
  assert.ok(track.duration);
  assert.notEqual(track.duration, "0:00");
});

test("YouTubeExtractor - playlist search and extraction", async () => {
  const { player } = await createTestPlayer();

  const result = await player.search(TEST_URLS.PLAYLIST_URL);
  assert.ok(result);
  assert.ok(result.hasPlaylist());
  assert.ok(result.playlist);
  assert.ok(result.playlist.title);
  assert.ok(result.playlist.tracks.length > 0);

  const firstTrack = result.playlist.tracks[0];
  assert.ok(firstTrack.title);
  assert.ok(firstTrack.url);
  assert.ok(firstTrack.duration);
  assert.notEqual(firstTrack.duration, "0:00");
});

test("YouTubeExtractor - audio streaming and seek", async () => {
  const { player } = await createTestPlayer();

  const result = await player.search(TEST_QUERIES.SEARCH_QUERY);
  assert.ok(result.tracks.length > 0);

  const track = result.tracks[0];
  const streamUrl = await track.extractor.stream(track);
  assert.ok(streamUrl);
  assert.equal(typeof streamUrl, "string");
  assert.ok(streamUrl.startsWith("https://"));

  const transcoder = createFFmpegStream(streamUrl, {
    seek: 120,
    fmt: "s16le"
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
});
