const { ChannelType } = require("discord.js");
const { useQueue, useMainPlayer } = require("discord-player");
const { logInfo } = require("./logger");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DATE_GETTERS = {
  year: (d) => d.getFullYear(),
  month: (d) => d.getMonth() + 1,
  day: (d) => d.getDate(),
  hour: (d) => d.getHours(),
  minute: (d) => d.getMinutes()
};

function createDateTrigger(dateStr) {
  const req = {};
  const parts = dateStr.trim().split(/\s+/);

  parts.forEach((part) => {
    const vals = part.split(/[:-]/).map(Number);

    if (part.includes(":")) {
      [req.hour, req.minute] = vals;
    } else if (part.includes("-")) {
      if (vals.length === 3) [req.year, req.month, req.day] = vals;
      else [req.month, req.day] = vals;
    } else {
      const v = Number(part);
      if (!isNaN(v)) {
        if (req.day !== undefined) {
          req.hour = v;
        } else {
          req[v > 31 ? "year" : "day"] = v;
        }
      }
    }
  });

  return (date) => {
    return Object.keys(req).every((key) => {
      if (req[key] === undefined) return true;
      return DATE_GETTERS[key](date) === req[key];
    });
  };
}

function loadEventsFromJson() {
  const configPath = path.join(__dirname, "../easter_eggs.json");

  if (!fs.existsSync(configPath)) {
    logInfo("[EasterEgg] Configuration file 'easter_eggs.json' not found.");
    return [];
  }

  try {
    const rawData = fs.readFileSync(configPath, "utf-8");
    const eventsConfig = JSON.parse(rawData);

    if (!Array.isArray(eventsConfig)) return [];

    return eventsConfig
      .filter(
        (e) =>
          e.date &&
          e.message &&
          Array.isArray(e.videos) &&
          e.videos.length > 0 &&
          (e.guild_id || e.guild_id_dev)
      )
      .map((e) => ({
        id: e.id || "UNKNOWN_EVENT",
        blockingMessage: e.message,
        trigger: createDateTrigger(e.date),
        action: async (client, activeEventInstance) => {
          const isDev = process.argv.includes("dev");
          const targetGuildId =
            isDev && e.guild_id_dev ? e.guild_id_dev : e.guild_id;

          await runAudioLoop(
            client,
            targetGuildId,
            e.videos,
            activeEventInstance.instanceId
          );
        }
      }));
  } catch (err) {
    logInfo("[EasterEgg] Error loading 'easter_eggs.json'", err);
    return [];
  }
}

const EVENTS = loadEventsFromJson();

if (EVENTS.length > 0) {
  logInfo(`[EasterEgg] Loaded ${EVENTS.length} events from JSON.`);
}

async function checkEasterEggs(client) {
  const now = new Date();
  const localTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );

  const activeEvent = EVENTS.find((e) => e.trigger(localTime));

  if (activeEvent) {
    if (
      !client.activeEasterEgg ||
      client.activeEasterEgg.id !== activeEvent.id
    ) {
      const instanceId = crypto.randomUUID();

      client.activeEasterEgg = {
        ...activeEvent,
        instanceId: instanceId
      };

      logInfo(
        "[EasterEgg] Event activated: " +
          `${activeEvent.id} (Instance: ${instanceId})`
      );

      activeEvent.action(client, client.activeEasterEgg).catch((err) => {
        logInfo(`[EasterEgg] Error in event ${activeEvent.id}`, err);
      });
    }
  } else {
    client.activeEasterEgg = null;
  }
}

function isInstanceActive(client, instanceId) {
  return client.activeEasterEgg?.instanceId === instanceId;
}

function safeCleanupQueue(queue, client, instanceId) {
  if (!queue) return;
  try {
    if (
      isInstanceActive(client, instanceId) ||
      client.activeEasterEgg === null
    ) {
      queue.delete();
    } else {
      logInfo(
        `[EasterEgg] Instance changed (Old: ${instanceId}, ` +
          `Current: ${client.activeEasterEgg?.instanceId}). ` +
          "Skipping queue deletion."
      );
    }
  } catch (err) {
    logInfo(
      `[EasterEgg] Error during queue cleanup for instance: ${instanceId}`,
      err
    );
  }
}

async function playTrackInChannel(
  client,
  player,
  guild,
  channel,
  trackUrl,
  instanceId
) {
  let queue;
  try {
    if (!isInstanceActive(client, instanceId)) return;

    logInfo(`[EasterEgg] [Instance: ${instanceId}] Joining #${channel.name}`);

    const existingQueue = useQueue(guild.id);
    safeCleanupQueue(existingQueue, client, instanceId);

    queue = player.nodes.create(guild, {
      leaveOnEnd: false,
      leaveOnStop: false,
      leaveOnEmpty: false,
      pauseOnEmpty: false,
      selfDeaf: false,
      metadata: {
        channel: channel,
        isEasterEgg: true,
        statusMessage: null
      }
    });

    const searchResult = await player.search(trackUrl, {
      requestedBy: client.user
    });

    if (!searchResult || !searchResult.tracks.length) {
      logInfo(`[EasterEgg] Track not found: ${trackUrl}`);
      safeCleanupQueue(queue, client, instanceId);
      sleep(1000);
      return;
    }

    const track = searchResult.tracks[0];
    const durationMs = track.durationMS || 10000;

    if (!queue.connection) await queue.connect(channel);
    queue.addTrack(track);
    await queue.node.play();

    logInfo(`[EasterEgg] Waiting ${durationMs}ms for track to finish...`);
    await sleep(durationMs + 2000);

    safeCleanupQueue(queue, client, instanceId);
  } catch (error) {
    logInfo(`[EasterEgg] Error processing channel #${channel.name}`, error);
    safeCleanupQueue(queue, client, instanceId);
    await sleep(1000);
  }
}

async function runAudioLoop(client, targetGuildId, videoList, instanceId) {
  const player = useMainPlayer();
  let videoIndex = 0;

  while (isInstanceActive(client, instanceId)) {
    const guild = client.guilds.cache.get(targetGuildId);

    if (!guild) {
      logInfo(`[EasterEgg] Guild ${targetGuildId} not found`);
      await sleep(10000);
      continue;
    }

    const voiceChannels = guild.channels.cache
      .filter(
        (c) =>
          c.type === ChannelType.GuildVoice &&
          c.permissionsFor(client.user).has("Connect") &&
          c.permissionsFor(client.user).has("Speak")
      )
      .sort((a, b) => a.position - b.position);

    if (!voiceChannels.size) {
      logInfo(
        `[EasterEgg] No accessible voice channels in guild ${targetGuildId}`
      );
      await sleep(10000);
      continue;
    }

    for (const [, channel] of voiceChannels) {
      if (!isInstanceActive(client, instanceId)) break;

      const currentTrackUrl = videoList[videoIndex];
      videoIndex = (videoIndex + 1) % videoList.length;

      await playTrackInChannel(
        client,
        player,
        guild,
        channel,
        currentTrackUrl,
        instanceId
      );
    }

    await sleep(1000);
  }

  logInfo(`[EasterEgg] Loop terminated for instance: ${instanceId}`);
}

module.exports = { checkEasterEggs };
