const { useQueue } = require("discord-player");
const { printError } = require("./embeds");
const { logInfo } = require("./logger");
const { canPlayTrack, sendLoadingStatus } = require("./status");
const { isTrackLongerThan } = require("./time");

function validateVoiceChannel(client, interaction) {
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    printError(interaction, "Musisz być na kanale głosowym!");
    return null;
  }

  if (
    !voiceChannel.permissionsFor(client.user).has("ViewChannel") ||
    !voiceChannel.permissionsFor(client.user).has("Connect") ||
    !voiceChannel.permissionsFor(client.user).has("Speak")
  ) {
    printError(
      interaction,
      "Nie mam uprawnień do połączenia się z kanałem głosowym!"
    );
    return null;
  }

  if (voiceChannel.full) {
    printError(interaction, "Kanał jest pełny! Spróbuj później.");
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
    printError(
      interaction,
      "Wystąpił błąd podczas tworzenia węzła! " + "Spróbuj ponownie później."
    );
    return null;
  }
}

function requireQueue(interaction, { checkEmpty = false } = {}) {
  const queue = useQueue(interaction.guildId || interaction.guild?.id);
  if (!queue || (checkEmpty && queue.getSize() === 0)) {
    printError(
      interaction,
      "Kolejka jest pusta! Użyj `/play`, aby dodać utwory."
    );
    return null;
  }
  return queue;
}

function validateTrackNumber(interaction, queue, songNumber) {
  if (songNumber > queue.getSize()) {
    printError(
      interaction,
      "Nie ma takiego utworu w kolejce! " +
        "Upewnij się, że podałeś poprawny numer."
    );
    return false;
  }
  return true;
}

function cleanTrackUrl(url) {
  if (typeof url !== "string") return url;
  return url.includes("/shorts/") ? url.replace("/shorts/", "/watch?v=") : url;
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
      ? `\n...i jeszcze ${failedUrls.length - 10} więcej`
      : "";
  return `${preview}${extra}`;
}

function cleanupEmptyQueue(queue) {
  if (queue && !queue.currentTrack && queue.tracks.size === 0) {
    queue.delete();
  }
}

module.exports = {
  validateVoiceChannel,
  getOrCreateQueue,
  requireQueue,
  validateTrackNumber,
  cleanTrackUrl,
  isPlayableTrack,
  startQueuePlayback,
  handleButton,
  formatFailedUrls,
  cleanupEmptyQueue
};
