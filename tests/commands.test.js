const assert = require("node:assert/strict");
const test = require("node:test");
const clearCommand = require("../commands/clear");
const infoCommand = require("../commands/info");
const nowplayingCommand = require("../commands/nowplaying");
const removeCommand = require("../commands/remove");
const seekCommand = require("../commands/seek");
const skiptoCommand = require("../commands/skipto");
const volumeCommand = require("../commands/volume");
const {
  TEST_ERRORS,
  createMockGuild,
  createMockInteraction,
  createMockTrack,
  createMockTracks,
  createTestPlayer
} = require("./factories");

test("clear command - metadata and empty queue check", async () => {
  const json = clearCommand.data.toJSON();
  assert.equal(json.name, "clear");

  const { client } = await createTestPlayer();
  const mockInteraction = createMockInteraction();

  await clearCommand.run({ client, interaction: mockInteraction });
  assert.equal(mockInteraction.getCapturedError(), TEST_ERRORS.QUEUE_EMPTY);
});

test("clear command - clears tracks in active queue", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-clear-active" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });
  const tracks = createMockTracks(player, 3);
  queue.addTrack(tracks);

  assert.equal(queue.getSize(), 3);

  const mockInteraction = createMockInteraction({ guild, deferred: true });
  mockInteraction.guildId = guild.id;

  await clearCommand.run({ client, interaction: mockInteraction });
  assert.equal(queue.getSize(), 0);

  queue.delete();
});

test("nowplaying command - metadata and empty queue check", async () => {
  const json = nowplayingCommand.data.toJSON();
  assert.equal(json.name, "nowplaying");

  const { client } = await createTestPlayer();
  const mockInteraction = createMockInteraction();

  await nowplayingCommand.run({ client, interaction: mockInteraction });
  assert.equal(mockInteraction.getCapturedError(), TEST_ERRORS.QUEUE_EMPTY);
});

test("remove command - validates empty queue and invalid index", async () => {
  const json = removeCommand.data.toJSON();
  assert.equal(json.name, "remove");

  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-remove-guild" });
  client.guilds.cache.set(guild.id, guild);

  const mockInteractionEmpty = createMockInteraction({
    guild,
    options: { number: 1 }
  });
  mockInteractionEmpty.guildId = guild.id;
  await removeCommand.run({ client, interaction: mockInteractionEmpty });
  assert.equal(
    mockInteractionEmpty.getCapturedError(),
    TEST_ERRORS.QUEUE_EMPTY
  );

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });
  queue.addTrack([createMockTrack(player, { title: "Track 1" })]);

  const mockInteractionOutOfBounds = createMockInteraction({
    guild,
    options: { number: 5 }
  });
  mockInteractionOutOfBounds.guildId = guild.id;
  await removeCommand.run({
    client,
    interaction: mockInteractionOutOfBounds
  });
  assert.ok(
    mockInteractionOutOfBounds
      .getCapturedError()
      .includes("Nie ma takiego utworu w kolejce")
  );

  const mockInteractionValid = createMockInteraction({
    guild,
    options: { number: 1 }
  });
  mockInteractionValid.guildId = guild.id;
  await removeCommand.run({ client, interaction: mockInteractionValid });
  assert.equal(queue.getSize(), 0);

  queue.delete();
});

test("skipto command - validates empty queue, index, and skips", async () => {
  const json = skiptoCommand.data.toJSON();
  assert.equal(json.name, "skipto");

  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-skipto-guild" });
  client.guilds.cache.set(guild.id, guild);

  const mockInteractionEmpty = createMockInteraction({
    guild,
    options: { number: 1 }
  });
  mockInteractionEmpty.guildId = guild.id;
  await skiptoCommand.run({ client, interaction: mockInteractionEmpty });
  assert.equal(
    mockInteractionEmpty.getCapturedError(),
    TEST_ERRORS.QUEUE_EMPTY
  );

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });
  queue.addTrack(createMockTracks(player, 3));

  const mockInteractionOutOfBounds = createMockInteraction({
    guild,
    options: { number: 10 }
  });
  mockInteractionOutOfBounds.guildId = guild.id;
  await skiptoCommand.run({
    client,
    interaction: mockInteractionOutOfBounds
  });
  assert.ok(
    mockInteractionOutOfBounds
      .getCapturedError()
      .includes("Nie ma takiego utworu w kolejce")
  );

  const mockInteractionValid = createMockInteraction({
    guild,
    options: { number: 2 }
  });
  mockInteractionValid.guildId = guild.id;
  let skipped = false;
  queue.node.skipTo = () => {
    skipped = true;
  };
  await skiptoCommand.run({ client, interaction: mockInteractionValid });
  assert.equal(skipped, true);

  queue.delete();
});

test("seek command - validates input formatting and time bounds", async () => {
  const json = seekCommand.data.toJSON();
  assert.equal(json.name, "seek");

  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-seek-guild" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  const mockInvalidFormat = createMockInteraction({
    guild,
    options: { time: "invalid:format:time" }
  });
  mockInvalidFormat.guildId = guild.id;
  await seekCommand.run({ client, interaction: mockInvalidFormat });
  assert.ok(
    mockInvalidFormat.getCapturedError().includes("Nieprawidłowy format czasu")
  );

  const mockNan = createMockInteraction({
    guild,
    options: { time: "abc:def" }
  });
  mockNan.guildId = guild.id;
  await seekCommand.run({ client, interaction: mockNan });
  assert.ok(mockNan.getCapturedError().includes("Nieprawidłowy format czasu"));

  Object.defineProperty(queue, "currentTrack", {
    value: null,
    configurable: true,
    writable: true
  });

  const mockNoTrack = createMockInteraction({
    guild,
    options: { time: "1:30" }
  });
  mockNoTrack.guildId = guild.id;
  await seekCommand.run({ client, interaction: mockNoTrack });
  assert.ok(
    mockNoTrack.getCapturedError().includes("Nie można przewinąć tego utworu")
  );

  const testTrack = createMockTrack(player, {
    durationMS: 120000,
    duration: "2:00"
  });
  Object.defineProperty(queue, "currentTrack", {
    value: testTrack,
    configurable: true,
    writable: true
  });

  const mockTooLong = createMockInteraction({
    guild,
    options: { time: "3:00" }
  });
  mockTooLong.guildId = guild.id;
  await seekCommand.run({ client, interaction: mockTooLong });
  assert.ok(
    mockTooLong
      .getCapturedError()
      .includes("Podaj czas krótszy niż długość utworu")
  );

  let seekedMs = null;
  queue.node.seek = async (ms) => {
    seekedMs = ms;
  };
  const mockValid = createMockInteraction({
    guild,
    options: { time: "1:15" }
  });
  mockValid.guildId = guild.id;
  await seekCommand.run({ client, interaction: mockValid });
  assert.equal(seekedMs, 75000);

  queue.delete();
});

test("volume command - validates empty queue and updates volume", async () => {
  const json = volumeCommand.data.toJSON();
  assert.equal(json.name, "volume");

  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-vol-guild" });
  client.guilds.cache.set(guild.id, guild);

  const mockEmpty = createMockInteraction({
    guild,
    options: { value: 80 }
  });
  mockEmpty.guildId = guild.id;
  await volumeCommand.run({ client, interaction: mockEmpty });
  assert.equal(mockEmpty.getCapturedError(), TEST_ERRORS.QUEUE_EMPTY);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  let newVolume = null;
  queue.node.setVolume = (vol) => {
    newVolume = vol;
  };

  const mockValid = createMockInteraction({
    guild,
    options: { value: 75 }
  });
  mockValid.guildId = guild.id;
  await volumeCommand.run({ client, interaction: mockValid });
  assert.equal(newVolume, 75);

  queue.delete();
});

test("info command - metadata and replies with ephemeral stats", async () => {
  const json = infoCommand.data.toJSON();
  assert.equal(json.name, "info");

  const client = {
    user: { username: "MusicBro" },
    ws: { ping: 42 },
    uptime: 125000
  };

  let repliedData = null;
  const interaction = {
    createdTimestamp: Date.now() - 50,
    reply: async (data) => {
      repliedData = data;
    }
  };

  await infoCommand.run({ client, interaction });
  assert.ok(repliedData);
  assert.ok(repliedData.embeds?.[0]);
  assert.ok(repliedData.embeds[0].data.description.includes("Ping"));
  assert.ok(repliedData.embeds[0].data.description.includes("Uptime"));
});
