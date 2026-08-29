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
  createMockButtonInteraction,
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
  "buttons - handles missing queue with deleteReply",
  { concurrency: true },
  async () => {
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
  }
);

test(
  "playback control buttons - controls playback state",
  { concurrency: true },
  async () => {
    const { guild, queue } = createMockQueue(player, client);
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
  }
);

test(
  "loop mode buttons - loopTrack, loopQueue, loopDisable",
  { concurrency: true },
  async () => {
    const { guild, queue } = createMockQueue(player, client);
    const interaction = createMockButtonInteraction(guild.id);

    await loopTrackBtn.run({ interaction });
    assert.equal(queue.repeatMode, QueueRepeatMode.TRACK);

    await loopQueueBtn.run({ interaction });
    assert.equal(queue.repeatMode, QueueRepeatMode.QUEUE);

    await loopDisableBtn.run({ interaction });
    assert.equal(queue.repeatMode, QueueRepeatMode.OFF);

    queue.delete();
  }
);

test(
  "pagination buttons - next and previous page changes",
  { concurrency: true },
  async () => {
    const { guild, queue } = createMockQueue(player, client);
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
  }
);

test(
  "refresh button - handles message id matching",
  { concurrency: true },
  async () => {
    let edited = false;
    const statusMessage = {
      edit: async () => {
        edited = true;
      },
      id: "valid-msg-123"
    };

    const { guild, queue } = createMockQueue(player, client, {
      metadata: { statusMessage }
    });

    const currentTrack = createMockTrack(player, {
      requestedBy: { id: "123" },
      title: "Track 1"
    });
    Object.defineProperty(queue, "currentTrack", {
      configurable: true,
      value: currentTrack,
      writable: true
    });

    const interactionMismatch = createMockButtonInteraction(guild.id, {
      message: { id: "different-id" }
    });

    await refreshBtn.run({ interaction: interactionMismatch });
    assert.equal(interactionMismatch.isDeletedReply(), true);

    const interactionMatch = createMockButtonInteraction(guild.id, {
      message: { id: "valid-msg-123" }
    });

    await refreshBtn.run({ interaction: interactionMatch });
    assert.equal(interactionMatch.isDeferred(), true);
    assert.equal(edited, true);

    queue.delete();
  }
);

test(
  "embedClose button - defers and deletes interaction message",
  { concurrency: true },
  async () => {
    let deletedMessage = false;
    const interaction = {
      deferUpdate: async () => {},
      message: {
        delete: async () => {
          deletedMessage = true;
        }
      }
    };

    await embedCloseBtn.run({ interaction });
    assert.equal(deletedMessage, true);
  }
);
