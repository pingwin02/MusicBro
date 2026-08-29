const assert = require("node:assert/strict");
const test = require("node:test");
const interactionCreate = require("../events/client/interactionCreate");
const audioTrackAdd = require("../events/player.events/audioTrackAdd");
const audioTracksAdd = require("../events/player.events/audioTracksAdd");
const emptyChannel = require("../events/player.events/emptyChannel");
const emptyQueue = require("../events/player.events/emptyQueue");
const playerFinish = require("../events/player.events/playerFinish");
const playerPause = require("../events/player.events/playerPause");
const playerResume = require("../events/player.events/playerResume");
const playerStart = require("../events/player.events/playerStart");
const volumeChange = require("../events/player.events/volumeChange");
const {
  createMockGuild,
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
  "player events - track add events update queue metadata",
  { concurrency: true },
  async () => {
    let sentStatus = false;
    const textChannel = {
      send: async () => {
        sentStatus = true;
        return { edit: async () => {} };
      }
    };

    const { queue } = createMockQueue(player, client, {
      textChannel
    });

    const singleTrack = createMockTrack(player, {
      requestedBy: { id: "123" },
      title: "Single Track"
    });
    Object.defineProperty(queue, "currentTrack", {
      configurable: true,
      value: singleTrack,
      writable: true
    });

    await audioTrackAdd.execute(queue, singleTrack);
    assert.equal(queue.metadata.page, 0);
    assert.equal(sentStatus, true);

    const playlistTracks = createMockTracks(player, 3);
    audioTracksAdd.execute(queue, playlistTracks);
    assert.equal(queue.metadata.page, 0);

    queue.delete();
  }
);

test(
  "player lifecycle events - execute without throwing",
  { concurrency: true },
  async () => {
    const { queue } = createMockQueue(player, client);

    await emptyChannel.execute(queue);
    await emptyQueue.execute(queue);
    await playerPause.execute(queue);
    await playerResume.execute(queue);
    await volumeChange.execute(queue, 80);

    queue.delete();
  }
);

test(
  "playerFinish - prints error on abrupt premature finish",
  { concurrency: true },
  async () => {
    let printedError = null;
    const textChannel = {
      send: async ({ embeds }) => {
        printedError = embeds?.[0]?.data?.description;
      }
    };

    const { queue } = createMockQueue(player, client, { textChannel });
    const track = createMockTrack(player, {
      duration: "3:30",
      title: "Test Broken Song"
    });

    await playerStart.execute(queue, track);
    assert.equal(queue.metadata.skippedByUser, false);
    assert.ok(queue.metadata.trackStartTime);

    await playerFinish.execute(queue, track);
    assert.ok(printedError);
    assert.ok(printedError.includes("Test Broken Song"));

    queue.delete();
  }
);

test(
  "playerFinish - does not print error when skipped by user",
  { concurrency: true },
  async () => {
    let printedError = null;
    const textChannel = {
      send: async ({ embeds }) => {
        printedError = embeds?.[0]?.data?.description;
      }
    };

    const { queue } = createMockQueue(player, client, { textChannel });
    const track = createMockTrack(player, {
      duration: "3:30",
      title: "Skipped Song"
    });

    await playerStart.execute(queue, track);
    queue.metadata.skippedByUser = true;

    await playerFinish.execute(queue, track);
    assert.equal(printedError, null);

    queue.delete();
  }
);

test(
  "interactionCreate - blocks user in different voice channel",
  { concurrency: true },
  async () => {
    const mockClient = {
      slashcommands: new Map(),
      user: { id: "bot-id" }
    };

    let errorSent = false;
    const botVoiceChannel = { id: "vc-1" };
    const userVoiceChannel = { id: "vc-2" };

    const interaction = {
      channel: {
        name: "general",
        permissionsFor: () => ({ has: () => true })
      },
      client: mockClient,
      commandName: "play",
      deferred: false,
      guild: {
        members: {
          me: { voice: { channel: botVoiceChannel } }
        },
        name: "Mock Guild"
      },
      isButton: () => false,
      isCommand: () => true,
      member: { voice: { channel: userVoiceChannel } },
      replied: false,
      reply: async () => {
        errorSent = true;
      },
      user: { username: "TestUser" }
    };

    await interactionCreate.execute(interaction);
    assert.equal(errorSent, true);
  }
);

test(
  "interactionCreate - blocks when active Easter Egg exists",
  { concurrency: true },
  async () => {
    const mockClient = {
      activeEasterEgg: { blockingMessage: "Easter Egg Active" },
      slashcommands: new Map(),
      user: { id: "bot-id" }
    };

    let replied = false;
    const sameVoiceChannel = { id: "vc-1" };
    const guild = createMockGuild({
      members: {
        me: { voice: { channel: sameVoiceChannel } }
      }
    });

    const interaction = {
      channel: {
        name: "general",
        permissionsFor: () => ({ has: () => true })
      },
      client: mockClient,
      commandName: "play",
      deferred: false,
      guild,
      guildId: guild.id,
      isButton: () => false,
      isCommand: () => true,
      isRepliable: () => true,
      member: { voice: { channel: sameVoiceChannel } },
      replied: false,
      reply: async () => {
        replied = true;
      },
      user: { username: "TestUser" }
    };

    const { queue } = createMockQueue(player, client, {
      guild,
      metadata: { isEasterEgg: true }
    });

    await interactionCreate.execute(interaction);
    assert.equal(replied, true);

    queue.delete();
  }
);

test(
  "interactionCreate - dispatches command to slashcommands",
  { concurrency: true },
  async () => {
    let commandRan = false;
    const slashcommands = new Map();
    slashcommands.set("testcmd", {
      run: async () => {
        commandRan = true;
      }
    });

    const mockClient = {
      slashcommands,
      user: { id: "bot-id" }
    };

    const sameVoiceChannel = { id: "vc-1" };

    const interaction = {
      channel: {
        name: "general",
        permissionsFor: () => ({ has: () => true })
      },
      client: mockClient,
      commandName: "testcmd",
      deferred: false,
      guild: {
        members: {
          me: { voice: { channel: sameVoiceChannel } }
        },
        name: "Mock Guild"
      },
      isButton: () => false,
      isCommand: () => true,
      member: { voice: { channel: sameVoiceChannel } },
      replied: false,
      reply: async () => {},
      user: { username: "TestUser" }
    };

    await interactionCreate.execute(interaction);
    assert.equal(commandRan, true);
  }
);
