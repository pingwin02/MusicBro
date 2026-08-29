const assert = require("node:assert/strict");
const test = require("node:test");
const exportCommand = require("../commands/export");
const importCommand = require("../commands/import");
const { t } = require("../utils/i18n");
const {
  TEST_ERRORS,
  createMockGuild,
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

test("export command - metadata definition", () => {
  const json = exportCommand.data.toJSON();
  assert.equal(json.name, "export");
  assert.equal(json.description, t("commands.export.description"));
});

test("import command - metadata and options definition", () => {
  const json = importCommand.data.toJSON();
  assert.equal(json.name, "import");
  assert.equal(json.options.length, 1);
  assert.equal(json.options[0].name, "data");
  assert.equal(json.options[0].required, true);
});

test("export command - returns error when queue is empty", async () => {
  const guild = createMockGuild();
  const mockInteraction = createMockInteraction({ guild });
  mockInteraction.guildId = guild.id;

  await exportCommand.run({ client, interaction: mockInteraction });

  assert.equal(mockInteraction.getCapturedError(), t("commands.export.empty"));
});

test("export command - exports formatted tracks string", async () => {
  const { guild, queue } = createMockQueue(player, client);

  const t1 = createMockTrack(player, {
    title: "Song 1",
    url: "https://youtube.com/watch?v=11111111111"
  });
  const t2 = createMockTrack(player, {
    title: "Song 2",
    url: "https://youtube.com/watch?v=22222222222"
  });

  queue.addTrack([t1, t2]);

  let sentEmbed = null;
  const mockInteraction = createMockInteraction({
    deferred: true,
    guild
  });
  mockInteraction.guildId = guild.id;
  mockInteraction.editReply = async (data) => {
    sentEmbed = data.embeds?.[0];
  };

  await exportCommand.run({ client, interaction: mockInteraction });

  assert.ok(sentEmbed);
  const desc = sentEmbed.data.description;
  assert.ok(desc.includes("https://youtu.be/11111111111"));
  assert.ok(desc.includes("https://youtu.be/22222222222"));
  assert.ok(desc.includes("\n"));

  queue.delete();
});

test("import command - requires voice channel", async () => {
  const mockInteraction = createMockInteraction({
    member: { voice: { channel: null } },
    options: {
      data: "https://youtube.com/watch?v=11111111111"
    }
  });

  await importCommand.run({ client, interaction: mockInteraction });

  assert.equal(
    mockInteraction.getCapturedError(),
    TEST_ERRORS.VOICE_CHANNEL_REQUIRED
  );
});

test("import command - validates empty data input", async () => {
  const mockInteraction = createMockInteraction({
    options: {
      data: "   \n  \n \r\n   "
    }
  });

  await importCommand.run({ client, interaction: mockInteraction });

  assert.equal(
    mockInteraction.getCapturedError(),
    t("commands.import.empty_data")
  );
});

test("import command - parses space-separated URLs", async () => {
  const mockInteraction = createMockInteraction({
    member: { voice: { channel: null } },
    options: {
      data:
        "https://youtube.com/watch?v=11111111111 " +
        "https://youtube.com/watch?v=22222222222"
    }
  });

  await importCommand.run({ client, interaction: mockInteraction });

  assert.equal(
    mockInteraction.getCapturedError(),
    TEST_ERRORS.VOICE_CHANNEL_REQUIRED
  );
});

test("import command - displays failed URLs when empty", async () => {
  const guild = createMockGuild();
  client.guilds.cache.set(guild.id, guild);

  const voiceChannel = {
    full: false,
    permissionsFor: () => ({ has: () => true })
  };

  const mockInteraction = createMockInteraction({
    deferred: true,
    guild,
    member: { voice: { channel: voiceChannel } },
    options: {
      data: "https://youtube.com/watch?v=invalid123"
    }
  });
  mockInteraction.guildId = guild.id;

  const originalSearch = player.search.bind(player);
  player.search = async () => ({ tracks: [] });

  await importCommand.run({ client, interaction: mockInteraction });

  player.search = originalSearch;

  const captured = mockInteraction.getCapturedError();
  assert.ok(
    captured.includes(
      t("commands.import.failed_all", { failedUrls: "" }).split("\n")[0]
    )
  );
  assert.ok(captured.includes("https://youtube.com/watch?v=invalid123"));
});
