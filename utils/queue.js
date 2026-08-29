const { useQueue } = require("discord-player");
const { YOUTUBE_SHORT_URL_REGEX } = require("./constants");
const { printError } = require("./embeds");
const { t } = require("./i18n");
const { logInfo } = require("./logger");
const { canPlayTrack, sendLoadingStatus } = require("./status");
const { isTrackLongerThan } = require("./time");

function validateVoiceChannel(client, interaction) {
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    printError(interaction, t("errors.voice_channel_required"));
    return null;
  }

  if (
    !voiceChannel.permissionsFor(client.user).has("ViewChannel") ||
    !voiceChannel.permissionsFor(client.user).has("Connect") ||
    !voiceChannel.permissionsFor(client.user).has("Speak")
  ) {
    printError(interaction, t("errors.voice_channel_permissions"));
    return null;
  }

  if (voiceChannel.full) {
    printError(interaction, t("errors.voice_channel_full"));
    return null;
  }

  return voiceChannel;
}

function getOrCreateQueue(player, interaction) {
  try {
    return player.nodes.create(interaction.guildId || interaction.guild, {
      leaveOnEnd: true,
      leaveOnStop: true,
      leaveOnEmpty: true,
      metadata: {
        textChannel: interaction.channel,
        statusMessage: null,
        page: 0
      }
    });
  } catch (err) {
    logInfo("Creating node", err);
    printError(interaction, t("errors.node_error"));
    return null;
  }
}

function requireQueue(interaction, { checkEmpty = false } = {}) {
  const queue = useQueue(interaction.guildId || interaction.guild?.id);
  if (!queue || (checkEmpty && queue.getSize() === 0)) {
    printError(interaction, t("errors.queue_empty"));
    return null;
  }
  return queue;
}

function validateTrackNumber(interaction, queue, songNumber) {
  if (songNumber > queue.getSize()) {
    printError(interaction, t("errors.invalid_track_number"));
    return false;
  }
  return true;
}

function cleanTrackUrl(url) {
  if (typeof url !== "string") return url;
  return url.includes("/shorts/") ? url.replace("/shorts/", "/watch?v=") : url;
}

function toShortTrackUrl(url) {
  if (typeof url !== "string") return url;
  const match = url.match(YOUTUBE_SHORT_URL_REGEX);
  return match ? `https://youtu.be/${match[1]}` : url;
}

function isPlayableTrack(track, maxTrackLengthMs = Number.MAX_SAFE_INTEGER) {
  const playability = canPlayTrack(track);
  const tooLong = isTrackLongerThan(track, maxTrackLengthMs);
  return playability.success && !tooLong;
}

async function startQueuePlayback(queue, interaction) {
  if (!queue.currentTrack) {
    await sendLoadingStatus(queue);
    await interaction.deleteReply().catch(() => {});
    await queue.node.play();
  } else {
    await interaction.deleteReply().catch(() => {});
  }
}

async function handleButton(interaction, callback) {
  await interaction.deferUpdate();
  const queue = useQueue(interaction.guildId || interaction.guild?.id);
  if (!queue) {
    await interaction.deleteReply();
    return;
  }
  await callback(queue);
}

function formatFailedUrls(failedUrls) {
  const preview = failedUrls
    .slice(0, 10)
    .map((u) => `• ${u}`)
    .join("\n");
  const extra =
    failedUrls.length > 10
      ? `\n${t("errors.more_failed", { count: failedUrls.length - 10 })}`
      : "";
  return `${preview}${extra}`;
}

function cleanupEmptyQueue(queue) {
  if (queue && !queue.currentTrack && queue.tracks.size === 0) {
    queue.delete();
  }
}

module.exports = {
  cleanTrackUrl,
  cleanupEmptyQueue,
  formatFailedUrls,
  getOrCreateQueue,
  handleButton,
  isPlayableTrack,
  requireQueue,
  startQueuePlayback,
  toShortTrackUrl,
  validateTrackNumber,
  validateVoiceChannel
};
