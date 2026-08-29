const assert = require("node:assert/strict");
const test = require("node:test");
const clearCommand = require("../commands/clear");
const infoCommand = require("../commands/info");
const nowplayingCommand = require("../commands/nowplaying");
const removeCommand = require("../commands/remove");
const seekCommand = require("../commands/seek");
const skiptoCommand = require("../commands/skipto");
const volumeCommand = require("../commands/volume");
const { t } = require("../utils/i18n");
const {
  TEST_ERRORS,
  createMockGuild,
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
  "clear command - metadata and empty queue check",
  { concurrency: true },
  async () => {
    const json = clearCommand.data.toJSON();
    assert.equal(json.name, "clear");

    const mockInteraction = createMockInteraction();
    await clearCommand.run({ client, interaction: mockInteraction });
    assert.equal(mockInteraction.getCapturedError(), TEST_ERRORS.QUEUE_EMPTY);
  }
);

test(
  "clear command - clears tracks in active queue",
  { concurrency: true },
  async () => {
    const { guild, queue } = createMockQueue(player, client);
    queue.addTrack(createMockTracks(player, 3));
    assert.equal(queue.getSize(), 3);

    const mockInteraction = createMockInteraction({ deferred: true, guild });
    mockInteraction.guildId = guild.id;

    await clearCommand.run({ client, interaction: mockInteraction });
    assert.equal(queue.getSize(), 0);

    queue.delete();
  }
);

test(
  "nowplaying command - metadata and empty queue check",
  { concurrency: true },
  async () => {
    const json = nowplayingCommand.data.toJSON();
    assert.equal(json.name, "nowplaying");

    const mockInteraction = createMockInteraction();
    await nowplayingCommand.run({ client, interaction: mockInteraction });
    assert.equal(mockInteraction.getCapturedError(), TEST_ERRORS.QUEUE_EMPTY);
  }
);

test(
  "remove command - validates empty queue and invalid index",
  { concurrency: true },
  async () => {
    const json = removeCommand.data.toJSON();
    assert.equal(json.name, "remove");

    const emptyGuild = createMockGuild();
    const mockInteractionEmpty = createMockInteraction({
      guild: emptyGuild,
      options: { number: 1 }
    });
    mockInteractionEmpty.guildId = emptyGuild.id;
    await removeCommand.run({ client, interaction: mockInteractionEmpty });
    assert.equal(
      mockInteractionEmpty.getCapturedError(),
      TEST_ERRORS.QUEUE_EMPTY
    );

    const { guild, queue } = createMockQueue(player, client);
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
    assert.equal(
      mockInteractionOutOfBounds.getCapturedError(),
      t("errors.invalid_track_number")
    );

    const mockInteractionValid = createMockInteraction({
      guild,
      options: { number: 1 }
    });
    mockInteractionValid.guildId = guild.id;
    await removeCommand.run({ client, interaction: mockInteractionValid });
    assert.equal(queue.getSize(), 0);

    queue.delete();
  }
);

test(
  "skipto command - validates empty queue, index, and skips",
  { concurrency: true },
  async () => {
    const json = skiptoCommand.data.toJSON();
    assert.equal(json.name, "skipto");

    const emptyGuild = createMockGuild();
    const mockInteractionEmpty = createMockInteraction({
      guild: emptyGuild,
      options: { number: 1 }
    });
    mockInteractionEmpty.guildId = emptyGuild.id;
    await skiptoCommand.run({ client, interaction: mockInteractionEmpty });
    assert.equal(
      mockInteractionEmpty.getCapturedError(),
      TEST_ERRORS.QUEUE_EMPTY
    );

    const { guild, queue } = createMockQueue(player, client);
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
    assert.equal(
      mockInteractionOutOfBounds.getCapturedError(),
      t("errors.invalid_track_number")
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
  }
);

test(
  "seek command - validates input formatting and time bounds",
  { concurrency: true },
  async () => {
    const json = seekCommand.data.toJSON();
    assert.equal(json.name, "seek");

    const { guild, queue } = createMockQueue(player, client);

    const mockInvalidFormat = createMockInteraction({
      guild,
      options: { time: "invalid:format:time" }
    });
    mockInvalidFormat.guildId = guild.id;
    await seekCommand.run({ client, interaction: mockInvalidFormat });
    assert.equal(
      mockInvalidFormat.getCapturedError(),
      t("commands.seek.format_error")
    );

    const mockNan = createMockInteraction({
      guild,
      options: { time: "abc:def" }
    });
    mockNan.guildId = guild.id;
    await seekCommand.run({ client, interaction: mockNan });
    assert.equal(mockNan.getCapturedError(), t("commands.seek.format_error"));

    Object.defineProperty(queue, "currentTrack", {
      configurable: true,
      value: null,
      writable: true
    });

    const mockNoTrack = createMockInteraction({
      guild,
      options: { time: "1:30" }
    });
    mockNoTrack.guildId = guild.id;
    await seekCommand.run({ client, interaction: mockNoTrack });
    assert.equal(
      mockNoTrack.getCapturedError(),
      t("commands.seek.no_duration")
    );

    const testTrack = createMockTrack(player, {
      duration: "2:00",
      durationMS: 120000
    });
    Object.defineProperty(queue, "currentTrack", {
      configurable: true,
      value: testTrack,
      writable: true
    });

    const mockTooLong = createMockInteraction({
      guild,
      options: { time: "3:00" }
    });
    mockTooLong.guildId = guild.id;
    await seekCommand.run({ client, interaction: mockTooLong });
    assert.equal(
      mockTooLong.getCapturedError(),
      t("commands.seek.out_of_range", { duration: "2:00" })
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
  }
);

test(
  "volume command - validates empty queue and updates volume",
  { concurrency: true },
  async () => {
    const json = volumeCommand.data.toJSON();
    assert.equal(json.name, "volume");

    const emptyGuild = createMockGuild();
    const mockEmpty = createMockInteraction({
      guild: emptyGuild,
      options: { value: 80 }
    });
    mockEmpty.guildId = emptyGuild.id;
    await volumeCommand.run({ client, interaction: mockEmpty });
    assert.equal(mockEmpty.getCapturedError(), TEST_ERRORS.QUEUE_EMPTY);

    const { guild, queue } = createMockQueue(player, client);

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
  }
);

test(
  "info command - metadata and replies with ephemeral stats",
  { concurrency: true },
  async () => {
    const json = infoCommand.data.toJSON();
    assert.equal(json.name, "info");

    const mockClient = {
      uptime: 125000,
      user: { username: "MusicBro" },
      ws: { ping: 42 }
    };

    let repliedData = null;
    const interaction = {
      createdTimestamp: Date.now() - 50,
      reply: async (data) => {
        repliedData = data;
      }
    };

    await infoCommand.run({ client: mockClient, interaction });
    assert.ok(repliedData);
    assert.ok(repliedData.embeds?.[0]);
    assert.ok(repliedData.embeds[0].data.description.includes("Ping"));
    assert.ok(repliedData.embeds[0].data.description.includes("Uptime"));
  }
);
