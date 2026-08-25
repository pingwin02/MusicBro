const assert = require("node:assert/strict");
const test = require("node:test");
const interactionCreate = require("../events/client/interactionCreate");
const audioTrackAdd = require("../events/player.events/audioTrackAdd");
const audioTracksAdd = require("../events/player.events/audioTracksAdd");
const emptyChannel = require("../events/player.events/emptyChannel");
const emptyQueue = require("../events/player.events/emptyQueue");
const playerPause = require("../events/player.events/playerPause");
const playerResume = require("../events/player.events/playerResume");
const volumeChange = require("../events/player.events/volumeChange");
const {
  createMockGuild,
  createMockTrack,
  createMockTracks,
  createTestPlayer
} = require("./factories");

test("player events - track add events update queue metadata", async () => {
  const { player, client } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-player-events" });
  client.guilds.cache.set(guild.id, guild);

  let sentStatus = false;
  const textChannel = {
    send: async () => {
      sentStatus = true;
      return { edit: async () => {} };
    }
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { textChannel }
  });

  const singleTrack = createMockTrack(player, {
    title: "Single Track",
    requestedBy: { id: "123" }
  });
  Object.defineProperty(queue, "currentTrack", {
    value: singleTrack,
    configurable: true,
    writable: true
  });

  await audioTrackAdd.execute(queue, singleTrack);
  assert.equal(queue.metadata.page, 0);
  assert.equal(sentStatus, true);

  const playlistTracks = createMockTracks(player, 3);
  audioTracksAdd.execute(queue, playlistTracks);
  assert.equal(queue.metadata.page, 0);

  queue.delete();
});

test("player lifecycle events - execute without throwing", async () => {
  const { player, client } = await createTestPlayer();
  const guild = createMockGuild({ id: "mock-lifecycle-events" });
  client.guilds.cache.set(guild.id, guild);
  const queue = player.nodes.create(guild.id);

  await emptyChannel.execute(queue);
  await emptyQueue.execute(queue);
  await playerPause.execute(queue);
  await playerResume.execute(queue);
  await volumeChange.execute(queue, 80);

  queue.delete();
});

test("interactionCreate - blocks user in different voice channel", async () => {
  const client = {
    user: { id: "bot-id" },
    slashcommands: new Map()
  };

  let errorSent = false;
  const botVoiceChannel = { id: "vc-1" };
  const userVoiceChannel = { id: "vc-2" };

  const interaction = {
    client,
    guild: {
      name: "Mock Guild",
      members: {
        me: { voice: { channel: botVoiceChannel } }
      }
    },
    channel: {
      name: "general",
      permissionsFor: () => ({ has: () => true })
    },
    member: { voice: { channel: userVoiceChannel } },
    user: { username: "TestUser" },
    commandName: "play",
    isCommand: () => true,
    isButton: () => false,
    deferred: false,
    replied: false,
    reply: async () => {
      errorSent = true;
    }
  };

  await interactionCreate.execute(interaction);
  assert.equal(errorSent, true);
});

test("interactionCreate - blocks when active Easter Egg exists", async () => {
  let repliedWithEasterEgg = false;
  const client = {
    user: { id: "bot-id" },
    activeEasterEgg: {
      blockingMessage: "Easter egg is running!"
    },
    slashcommands: new Map()
  };

  const interaction = {
    client,
    guild: {
      name: "Mock Guild",
      members: { me: { voice: { channel: null } } }
    },
    channel: {
      name: "general",
      permissionsFor: () => ({ has: () => true })
    },
    member: { voice: { channel: null } },
    user: { username: "TestUser" },
    commandName: "info",
    isCommand: () => true,
    isButton: () => false,
    isRepliable: () => true,
    reply: async (data) => {
      if (data.content === "Easter egg is running!") {
        repliedWithEasterEgg = true;
      }
    }
  };

  await interactionCreate.execute(interaction);
  assert.equal(repliedWithEasterEgg, true);
});

test("interactionCreate - dispatches command to slashcommands", async () => {
  let commandExecuted = false;
  const mockCommand = {
    run: async () => {
      commandExecuted = true;
    }
  };

  const slashcommands = new Map();
  slashcommands.set("testcmd", mockCommand);

  const client = {
    user: { id: "bot-id" },
    slashcommands
  };

  const interaction = {
    client,
    guild: {
      name: "Mock Guild",
      members: { me: { voice: { channel: null } } }
    },
    channel: {
      name: "general",
      permissionsFor: () => ({ has: () => true })
    },
    member: { voice: { channel: null } },
    user: { username: "TestUser" },
    commandName: "testcmd",
    isCommand: () => true,
    isButton: () => false,
    isRepliable: () => true
  };

  await interactionCreate.execute(interaction);
  assert.equal(commandExecuted, true);
});
