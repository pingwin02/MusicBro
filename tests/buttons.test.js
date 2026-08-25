const assert = require("node:assert/strict");
const test = require("node:test");
const { QueueRepeatMode } = require("discord-player");
const embedCloseBtn = require("../buttons/embedClose");
const loopDisableBtn = require("../buttons/loopDisable");
const loopQueueBtn = require("../buttons/loopQueue");
const loopTrackBtn = require("../buttons/loopTrack");
const nextBtn = require("../buttons/next");
const pauseBtn = require("../buttons/pause");
const previousBtn = require("../buttons/previous");
const refreshBtn = require("../buttons/refresh");
const resumeBtn = require("../buttons/resume");
const shuffleBtn = require("../buttons/shuffle");
const skipBtn = require("../buttons/skip");
const stopBtn = require("../buttons/stop");
const {
  createMockGuild,
  createMockTrack,
  createMockTracks,
  createTestPlayer
} = require("./factories");

function createMockButtonInteraction(guildId = null) {
  let deferredUpdate = false;
  let deletedReply = false;
  return {
    guildId,
    guild: guildId ? { id: guildId } : null,
    message: { id: "default-msg-id" },
    deferUpdate: async () => {
      deferredUpdate = true;
    },
    deleteReply: async () => {
      deletedReply = true;
    },
    isDeferred: () => deferredUpdate,
    isDeletedReply: () => deletedReply
  };
}

test("buttons - handles missing queue with deleteReply", async () => {
  await createTestPlayer();
  const buttons = [
    pauseBtn,
    resumeBtn,
    skipBtn,
    stopBtn,
    shuffleBtn,
    loopDisableBtn,
    loopQueueBtn,
    loopTrackBtn,
    nextBtn,
    previousBtn
  ];

  for (const btn of buttons) {
    const interaction = createMockButtonInteraction("non-existent-guild");
    await btn.run({ interaction });
    assert.equal(interaction.isDeferred(), true);
    assert.equal(interaction.isDeletedReply(), true);
  }
});

test("playback control buttons - controls playback state", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-buttons-guild" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });
  queue.addTrack(createMockTracks(player, 3));

  let pausedState = null;
  queue.node.setPaused = (val) => {
    pausedState = val;
  };
  let skipped = false;
  queue.node.skip = () => {
    skipped = true;
  };

  const interaction = createMockButtonInteraction(guild.id);

  await pauseBtn.run({ interaction });
  assert.equal(pausedState, true);

  await resumeBtn.run({ interaction });
  assert.equal(pausedState, false);

  await skipBtn.run({ interaction });
  assert.equal(skipped, true);

  let shuffled = false;
  queue.tracks.shuffle = () => {
    shuffled = true;
  };
  await shuffleBtn.run({ interaction });
  assert.equal(shuffled, true);

  await stopBtn.run({ interaction });
  assert.equal(player.nodes.get(guild.id), null);
});

test("loop mode buttons - loopTrack, loopQueue, loopDisable", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-loop-buttons" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });
  const interaction = createMockButtonInteraction(guild.id);

  await loopTrackBtn.run({ interaction });
  assert.equal(queue.repeatMode, QueueRepeatMode.TRACK);

  await loopQueueBtn.run({ interaction });
  assert.equal(queue.repeatMode, QueueRepeatMode.QUEUE);

  await loopDisableBtn.run({ interaction });
  assert.equal(queue.repeatMode, QueueRepeatMode.OFF);

  queue.delete();
});

test("pagination buttons - next and previous page changes", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-page-buttons" });
  client.guilds.cache.set(guild.id, guild);

  const textChannel = { send: async () => ({ delete: async () => {} }) };
  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel, page: 0 }
  });
  const interaction = createMockButtonInteraction(guild.id);

  await nextBtn.run({ interaction });
  assert.equal(queue.metadata.page, 1);

  await nextBtn.run({ interaction });
  assert.equal(queue.metadata.page, 2);

  await previousBtn.run({ interaction });
  assert.equal(queue.metadata.page, 1);

  await previousBtn.run({ interaction });
  assert.equal(queue.metadata.page, 0);

  await previousBtn.run({ interaction });
  assert.equal(queue.metadata.page, 0);

  queue.delete();
});

test("refresh button - handles message id matching", async () => {
  const { client, player } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-refresh-buttons" });
  client.guilds.cache.set(guild.id, guild);

  let edited = false;
  const statusMessage = {
    id: "valid-msg-123",
    edit: async () => {
      edited = true;
    }
  };

  const queue = player.nodes.create(guild.id, {
    metadata: {
      textChannel: { send: async () => statusMessage },
      page: 0,
      statusMessage
    }
  });

  const currentTrack = createMockTrack(player, {
    title: "Track 1",
    requestedBy: { id: "123" }
  });
  Object.defineProperty(queue, "currentTrack", {
    value: currentTrack,
    configurable: true,
    writable: true
  });

  const interactionMismatch = createMockButtonInteraction(guild.id);
  interactionMismatch.message = { id: "different-id" };

  await refreshBtn.run({ interaction: interactionMismatch });
  assert.equal(interactionMismatch.isDeletedReply(), true);

  const interactionMatch = createMockButtonInteraction(guild.id);
  interactionMatch.message = { id: "valid-msg-123" };

  await refreshBtn.run({ interaction: interactionMatch });
  assert.equal(interactionMatch.isDeferred(), true);
  assert.equal(edited, true);

  queue.delete();
});

test("embedClose button - defers and deletes interaction message", async () => {
  let deferred = false;
  let deleted = false;
  const interaction = {
    deferUpdate: async () => {
      deferred = true;
    },
    message: {
      delete: async () => {
        deleted = true;
      }
    }
  };

  await embedCloseBtn.run({ interaction });
  assert.equal(deferred, true);
  assert.equal(deleted, true);
});
