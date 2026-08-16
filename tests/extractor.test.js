const test = require("node:test");
const assert = require("node:assert/strict");
const { Client, GatewayIntentBits } = require("discord.js");
const { Player, createFFmpegStream } = require("discord-player");
const { YouTubeExtractor } = require("../extractors");

const MIX_URL =
  "https://www.youtube.com/watch?v=4NRXx6U8ABQ&" +
  "list=RDXXYlFuWEuKI&start_radio=1";

test("YouTubeExtractor - initialization and registration", async () => {
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});

  const extractor = player.extractors.get("com.musicbro.youtube");
  assert.ok(extractor);
  assert.equal(extractor.identifier, "com.musicbro.youtube");
});

test("YouTubeExtractor - query validation", async () => {
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});
  const extractor = player.extractors.get("com.musicbro.youtube");

  assert.equal(
    await extractor.validate("https://www.youtube.com/watch?v=XXYlFuWEuKI"),
    true
  );
  assert.equal(await extractor.validate("https://youtu.be/XXYlFuWEuKI"), true);
  assert.equal(
    await extractor.validate("youtube: The Weeknd - Save Your Tears"),
    true
  );
  assert.equal(
    await extractor.validate("ytsearch: Never Gonna Give You Up"),
    true
  );
  assert.equal(
    await extractor.validate(
      "https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj"
    ),
    true
  );
  assert.equal(
    await extractor.validate("ytplaylist: Top 50 Global Hits"),
    true
  );
  assert.equal(await extractor.validate(MIX_URL), true);
  assert.equal(await extractor.validate("arbitrary", "arbitrary"), false);
});

test("YouTubeExtractor - track search and metadata", async () => {
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});

  const result = await player.search("youtube: The Weeknd - Save Your Tears");
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
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});

  const videoUrl = "https://www.youtube.com/watch?v=XXYlFuWEuKI";
  const result = await player.search(videoUrl);
  assert.ok(result);
  assert.ok(result.tracks.length > 0);

  const track = result.tracks[0];
  assert.equal(track.url, "https://youtube.com/watch?v=XXYlFuWEuKI");
  assert.ok(track.title);
  assert.ok(track.duration);
  assert.notEqual(track.duration, "0:00");
});

test("YouTubeExtractor - mix and radio playlist URL resolution", async () => {
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});

  const result = await player.search(MIX_URL);
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
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});

  const playlistUrl =
    "https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj";
  const result = await player.search(playlistUrl);
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
  const client = new Client({
    intents: [GatewayIntentBits.GuildVoiceStates]
  });
  const player = new Player(client);
  await player.extractors.register(YouTubeExtractor, {});

  const result = await player.search("youtube: The Weeknd - Save Your Tears");
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
