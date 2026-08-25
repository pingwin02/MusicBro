const assert = require("node:assert/strict");
const test = require("node:test");
const exportCommand = require("../commands/export");
const importCommand = require("../commands/import");
const {
  TEST_ERRORS,
  createMockGuild,
  createMockInteraction,
  createMockTrack,
  createTestPlayer
} = require("./factories");

test("export command - metadata definition", () => {
  const json = exportCommand.data.toJSON();
  assert.equal(json.name, "export");
  assert.equal(json.description, "Eksportuje aktualną kolejkę utworów");
});

test("import command - metadata and options definition", () => {
  const json = importCommand.data.toJSON();
  assert.equal(json.name, "import");
  assert.equal(json.options.length, 1);
  assert.equal(json.options[0].name, "data");
  assert.equal(json.options[0].required, true);
});

test("export command - returns error when queue is empty", async () => {
  const { client } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-export-empty" });
  const mockInteraction = createMockInteraction({ guild });
  mockInteraction.guildId = guild.id;

  await exportCommand.run({ client, interaction: mockInteraction });

  assert.equal(
    mockInteraction.getCapturedError(),
    "Kolejka jest pusta! Nie ma nic do wyeksportowania."
  );
});

test("export command - exports formatted tracks string", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-export-tracks" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = {
    send: async () => ({ delete: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

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
    guild,
    deferred: true
  });
  mockInteraction.guildId = guild.id;
  mockInteraction.editReply = async (data) => {
    sentEmbed = data.embeds?.[0];
  };

  await exportCommand.run({ client, interaction: mockInteraction });

  assert.ok(sentEmbed);
  const desc = sentEmbed.data.description;
  assert.ok(desc.includes("https://youtube.com/watch?v=11111111111"));
  assert.ok(desc.includes("https://youtube.com/watch?v=22222222222"));
  assert.ok(desc.includes("\n"));

  queue.delete();
});

test("import command - requires voice channel", async () => {
  const { client } = await createTestPlayer();
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
  const { client } = await createTestPlayer();
  const mockInteraction = createMockInteraction({
    options: {
      data: "   \n  \n \r\n   "
    }
  });

  await importCommand.run({ client, interaction: mockInteraction });

  assert.equal(
    mockInteraction.getCapturedError(),
    "Nie podano żadnych prawidłowych linków do zaimportowania!"
  );
});

test("import command - parses space-separated URLs", async () => {
  const { client } = await createTestPlayer();
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
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-import-failed" });
  client.guilds.cache.set(guild.id, guild);

  const voiceChannel = {
    permissionsFor: () => ({ has: () => true }),
    full: false
  };

  const mockInteraction = createMockInteraction({
    guild,
    member: { voice: { channel: voiceChannel } },
    options: {
      data: "https://youtube.com/watch?v=invalid123"
    },
    deferred: true
  });
  mockInteraction.guildId = guild.id;

  player.search = async () => ({ tracks: [] });

  await importCommand.run({ client, interaction: mockInteraction });

  const captured = mockInteraction.getCapturedError();
  assert.ok(
    captured.includes("Nie udało się zaimportować utworów z podanych linków:")
  );
  assert.ok(captured.includes("https://youtube.com/watch?v=invalid123"));
});
