const assert = require("node:assert/strict");
const test = require("node:test");
const { QueueRepeatMode } = require("discord-player");
const playerErrorEvent = require("../events/player.events/playerError");
const {
  createMockGuild,
  createMockTrack,
  createMockTracks,
  createTestPlayer
} = require("./factories");

test("playerError - keeps queue when next tracks exist", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild();
  client.guilds.cache.set(guild.id, guild);

  const textChannel = {
    send: async () => ({ delete: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  let deleted = false;
  const originalDelete = queue.delete.bind(queue);
  queue.delete = () => {
    deleted = true;
    return originalDelete();
  };

  const tracks = createMockTracks(player, 2, "Song");
  queue.addTrack(tracks);

  const failingTrack = createMockTrack(player, { title: "Faulty Song" });
  const error = new Error("Could not extract stream for this track");

  for (let i = 1; i <= 5; i++) {
    await playerErrorEvent.execute(queue, error, failingTrack);
    if (i < 5) {
      assert.equal(queue.tracks.toArray()[0].title, "Faulty Song");
      queue.tracks.dispatch();
    }
  }

  assert.equal(deleted, false);
  assert.equal(queue.tracks.size, 2);

  queue.delete();
});

test("playerError - retries track up to 5 attempts", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-guild-retry-attempts" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = {
    send: async () => ({ delete: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  const failingTrack = createMockTrack(player, { title: "Failing Song" });
  const error = new Error("Extraction error");

  for (let i = 1; i <= 4; i++) {
    await playerErrorEvent.execute(queue, error, failingTrack);
    assert.equal(failingTrack.errorAttempts, i);
    assert.equal(queue.tracks.size, 1);
    queue.tracks.dispatch();
  }

  await playerErrorEvent.execute(queue, error, failingTrack);
  assert.equal(failingTrack.errorAttempts, 5);
  assert.equal(queue.tracks.size, 0);
});

test("playerError - preserves track on QUEUE repeat mode", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-guild-queue-loop" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = {
    send: async () => ({ delete: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  queue.setRepeatMode(QueueRepeatMode.QUEUE);

  const otherTrack = createMockTrack(player, { title: "Good Song" });
  queue.addTrack(otherTrack);

  const failingTrack = createMockTrack(player, { title: "Failing Song" });
  const error = new Error("Extraction error");

  for (let i = 1; i <= 4; i++) {
    await playerErrorEvent.execute(queue, error, failingTrack);
    assert.equal(failingTrack.errorAttempts, i);
    assert.equal(queue.tracks.size, 2);
    queue.tracks.dispatch();
  }

  await playerErrorEvent.execute(queue, error, failingTrack);
  assert.equal(failingTrack.errorAttempts, 0);
  assert.equal(queue.tracks.size, 2);
  const titles = queue.tracks.toArray().map((t) => t.title);
  assert.deepEqual(titles, ["Good Song", "Failing Song"]);

  queue.delete();
});

test("playerError event - resets QueueRepeatMode.TRACK to OFF", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-guild-track-loop" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = {
    send: async () => ({ delete: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  queue.setRepeatMode(QueueRepeatMode.TRACK);

  const nextTrack = createMockTrack(player, { title: "Next Track" });
  queue.addTrack(nextTrack);

  const failingTrack = createMockTrack(player, { title: "Failing Track Loop" });
  const error = new Error("Extraction error");

  for (let i = 1; i <= 5; i++) {
    await playerErrorEvent.execute(queue, error, failingTrack);
    if (i < 5) {
      queue.tracks.dispatch();
    }
  }

  assert.equal(queue.repeatMode, QueueRepeatMode.OFF);

  queue.delete();
});

test("playerError - deletes queue after 5 attempts when empty", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-guild-empty-delete" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = {
    send: async () => ({ delete: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });

  let deleted = false;
  const originalDelete = queue.delete.bind(queue);
  queue.delete = () => {
    deleted = true;
    return originalDelete();
  };

  const failingTrack = createMockTrack(player, {
    title: "Single Failing Song"
  });
  const error = new Error("Could not extract stream");

  for (let i = 1; i <= 4; i++) {
    await playerErrorEvent.execute(queue, error, failingTrack);
    assert.equal(deleted, false);
    queue.tracks.dispatch();
  }

  await playerErrorEvent.execute(queue, error, failingTrack);
  assert.equal(deleted, true);
});
