const { logInfo } = require("./logger");

/**
 * Converts a number of milliseconds to a human-readable time format.
 * @param {number} ms - Number of milliseconds to convert.
 * @returns {string} Human-readable time format.
 */
function msToTime(ms) {
  const seconds = (ms / 1000).toFixed(1);
  const minutes = (ms / (1000 * 60)).toFixed(1);
  const hours = (ms / (1000 * 60 * 60)).toFixed(1);
  const days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  if (seconds < 60) return seconds + " sekund";
  else if (minutes < 60) return minutes + " minut";
  else if (hours < 24) return hours + " godzin";
  return days + " dni";
}

/**
 * Deletes a message after a specified timeout.
 * @param {Message} message - Message to delete.
 * @param {number} timeout - Timeout in milliseconds. (default: 3000)
 * @returns {void}
 */
function timedDelete(message, timeout = 3000) {
  setTimeout(async () => {
    try {
      await message.delete();
    } catch (err) {
      logInfo("timedDelete", err.status === 404 ? err.message : err);
    }
  }, timeout);
}

/**
 * Check if a track's duration is greater than the provided limit.
 * Accepts track objects that contain either `durationMS` (number of ms)
 * or `duration` as a string in "HH:MM:SS", "MM:SS" or "SS" format.
 *
 * @param {Object} track - Track object.
 * @param {number} maxMs - Limit in milliseconds.
 * @returns {boolean} True if the track is longer than maxMs, otherwise false.
 */
function isTrackLongerThan(track, maxMs) {
  if (!track || typeof maxMs !== "number" || maxMs <= 0) return false;

  if (typeof track.durationMS === "number") {
    return track.durationMS > maxMs;
  }

  const dur = typeof track.duration === "string" ? track.duration.trim() : "";
  if (!dur) return false;

  if (!/^[0-9:]+$/.test(dur)) return false;

  const parts = dur.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return false;

  let totalSeconds = 0;
  if (parts.length === 3) {
    totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    totalSeconds = parts[0] * 60 + parts[1];
  } else {
    totalSeconds = parts[0];
  }

  return totalSeconds * 1000 > maxMs;
}

module.exports = {
  msToTime,
  timedDelete,
  isTrackLongerThan
};
