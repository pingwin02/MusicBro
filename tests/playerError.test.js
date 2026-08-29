const assert = require("node:assert/strict");
const test = require("node:test");
const { QueueRepeatMode } = require("discord-player");
const playerErrorEvent = require("../events/player.events/playerError");
const {
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
  "playerError - keeps queue when next tracks exist",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

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
  }
);

test(
  "playerError - retries track up to 5 attempts",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

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
  }
);

test(
  "playerError - preserves track on QUEUE repeat mode",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

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
  }
);

test(
  "playerError event - resets QueueRepeatMode.TRACK to OFF",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

    queue.setRepeatMode(QueueRepeatMode.TRACK);

    const nextTrack = createMockTrack(player, { title: "Next Track" });
    queue.addTrack(nextTrack);

    const failingTrack = createMockTrack(player, {
      title: "Failing Track Loop"
    });
    const error = new Error("Extraction error");

    for (let i = 1; i <= 5; i++) {
      await playerErrorEvent.execute(queue, error, failingTrack);
      if (i < 5) {
        queue.tracks.dispatch();
      }
    }

    assert.equal(queue.repeatMode, QueueRepeatMode.OFF);

    queue.delete();
  }
);

test(
  "playerError - deletes queue after 5 attempts when empty",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

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
  }
);
