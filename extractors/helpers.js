const {
  DURATION_DIGITS_REGEX,
  DURATION_LABEL_REGEX,
  HTTP_STATUS,
  YOUTUBE_PLAYLIST_REGEX,
  YOUTUBE_URL_REGEX
} = require("../utils/constants");

function parseDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    const paddedMin = minutes.toString().padStart(2, "0");
    const paddedSec = secs.toString().padStart(2, "0");
    return `${hours}:${paddedMin}:${paddedSec}`;
  }
  const paddedSec = secs.toString().padStart(2, "0");
  return `${minutes}:${paddedSec}`;
}

function extractDuration(video) {
  if (
    typeof video.duration?.seconds === "number" &&
    video.duration.seconds > 0
  ) {
    return parseDuration(video.duration.seconds);
  }
  if (typeof video.duration?.text === "string" && video.duration.text) {
    return video.duration.text;
  }
  if (video.content_image?.overlays) {
    for (const overlay of video.content_image.overlays) {
      if (overlay.badges) {
        for (const badge of overlay.badges) {
          if (badge.text && DURATION_DIGITS_REGEX.test(badge.text)) {
            return badge.text;
          }
        }
      }
    }
  }
  if (video.thumbnail_overlays) {
    for (const overlay of video.thumbnail_overlays) {
      if (overlay.text && DURATION_DIGITS_REGEX.test(overlay.text)) {
        return overlay.text;
      }
    }
  }
  const label = video.renderer_context?.accessibility_context?.label;
  if (label) {
    const match = label.match(DURATION_LABEL_REGEX);
    if (match && (match[1] || match[2] || match[3])) {
      const hours = Number.parseInt(match[1] || "0", 10);
      const minutes = Number.parseInt(match[2] || "0", 10);
      const seconds = Number.parseInt(match[3] || "0", 10);
      const totalSecs = hours * 3600 + minutes * 60 + seconds;
      if (totalSecs > 0) return parseDuration(totalSecs);
    }
  }
  return "0:00";
}

function extractAuthor(video) {
  if (video.author?.name) return video.author.name;
  if (
    video.author?.toString() &&
    video.author.toString() !== "[object Object]"
  ) {
    return video.author.toString();
  }
  if (video.short_byline?.text) return video.short_byline.text;
  const metaText =
    video.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text;
  if (metaText?.text) return metaText.text;
  if (metaText?.toString()) return metaText.toString();
  return "Unknown";
}

function extractVideoProperties(video) {
  const videoId = video.id || video.content_id || video.video_id || null;
  const title =
    video.title?.text ||
    video.title?.toString() ||
    video.metadata?.title?.text ||
    video.metadata?.title?.toString() ||
    "Unknown";
  const author = extractAuthor(video);
  const thumbnail =
    video.thumbnails?.[0]?.url ||
    video.thumbnail?.[0]?.url ||
    video.content_image?.image?.[0]?.url ||
    "";
  const duration = extractDuration(video);
  const rawViews =
    video.view_count?.text ||
    video.views?.text ||
    video.view_count?.toString() ||
    video.metadata?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text
      ?.text ||
    "0";
  const views = Number.parseInt(String(rawViews).replace(/\D/g, "") || "0", 10);

  return {
    author,
    duration,
    thumbnail,
    title,
    videoId,
    views
  };
}

function extractMusicSongProperties(song) {
  const videoId = song.id || song.video_id || null;
  const title =
    song.title?.text || song.title?.toString() || song.name || "Unknown";
  const author =
    song.artists?.[0]?.name ||
    song.authors?.[0]?.name ||
    song.author?.name ||
    song.author?.toString() ||
    "Unknown";
  const thumbnail =
    song.thumbnails?.[0]?.url ||
    song.thumbnail?.contents?.[0]?.url ||
    song.thumbnail?.url ||
    "";
  const duration =
    song.duration?.text ||
    (typeof song.duration?.seconds === "number" && song.duration.seconds > 0
      ? parseDuration(song.duration.seconds)
      : "0:00");
  const rawViews = song.views?.text || song.views?.toString() || "0";
  const views = Number.parseInt(String(rawViews).replace(/\D/g, "") || "0", 10);

  return {
    author,
    duration,
    thumbnail,
    title,
    videoId,
    views
  };
}

function extractVideoId(url) {
  const match = url.match(YOUTUBE_URL_REGEX);
  return match?.[1] || null;
}

function extractPlaylistId(url) {
  const match = url.match(YOUTUBE_PLAYLIST_REGEX);
  return match?.[1] || null;
}

function createHttpStream(url, contentLength, chunkSize = 524288) {
  const { PassThrough } = require("node:stream");
  const stream = new PassThrough();
  let position = 0;
  let isDestroyed = false;

  (async () => {
    try {
      while (!isDestroyed) {
        if (contentLength && position >= contentLength) break;
        const end = contentLength
          ? Math.min(position + chunkSize - 1, contentLength - 1)
          : position + chunkSize - 1;

        const response = await fetch(url, {
          headers: {
            Range: `bytes=${position}-${end}`
          }
        });

        if (
          response.status !== HTTP_STATUS.PARTIAL_CONTENT &&
          response.status !== HTTP_STATUS.OK
        ) {
          break;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (isDestroyed) break;
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length === 0) break;

        position += buffer.length;
        const canContinue = stream.write(buffer);
        if (!canContinue && !isDestroyed) {
          await new Promise((resolve) => {
            const onDrain = () => {
              stream.removeListener("close", onClose);
              resolve();
            };
            const onClose = () => {
              stream.removeListener("drain", onDrain);
              resolve();
            };
            stream.once("drain", onDrain);
            stream.once("close", onClose);
          });
        }

        if (contentLength && position >= contentLength) break;
      }
    } catch (err) {
      if (!isDestroyed) stream.emit("error", err);
    } finally {
      if (!isDestroyed) stream.end();
    }
  })();

  stream.on("close", () => {
    isDestroyed = true;
  });

  return stream;
}

module.exports = {
  createHttpStream,
  extractAuthor,
  extractDuration,
  extractMusicSongProperties,
  extractPlaylistId,
  extractVideoId,
  extractVideoProperties,
  parseDuration
};
