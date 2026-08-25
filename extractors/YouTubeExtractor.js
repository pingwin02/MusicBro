const { BaseExtractor, Playlist, Track } = require("discord-player");
const { Innertube, UniversalCache, Platform } = require("youtubei.js");
const vm = require("node:vm");
const { getPoToken } = require("./tokenGenerator");

const MAX_SEARCH_RESULTS = 10;
const MAX_RELATED_TRACKS = 5;
const MAX_PLAYLIST_TRACKS = 100;
const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_PLAYLIST_REGEX = /[&?]list=([a-zA-Z0-9_-]+)/;
const YOUTUBE_DOMAIN_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//;
const DURATION_DIGITS_REGEX = /^\d+:\d+(:\d+)?$/;
const DURATION_LABEL_REGEX =
  /(?:(\d+)\s+hours?)?[,\s]*(?:(\d+)\s+minutes?)?[,\s]*(?:(\d+)\s+seconds?)?/;

function setupYoutubeJsEvaluator() {
  Platform.shim.eval = async (data, env) => {
    const properties = [];
    if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
    if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    const code =
      `(() => { ${data.output}\n` + `return { ${properties.join(", ")} }; })()`;
    return vm.runInThisContext(code);
  };
}

class YouTubeExtractor extends BaseExtractor {
  static identifier = "com.musicbro.youtube";
  #innertube = null;

  async activate() {
    setupYoutubeJsEvaluator();
    this.#innertube = await Innertube.create({
      cache: new UniversalCache(true, "/tmp/.cache")
    });
    this.protocols = ["ytsearch", "youtube", "ytplaylist"];
  }

  async deactivate() {
    this.#innertube = null;
  }

  async validate(query, type) {
    if (type === "arbitrary") return false;
    return (
      YOUTUBE_DOMAIN_REGEX.test(query) ||
      query.startsWith("youtube:") ||
      query.startsWith("ytsearch:") ||
      query.startsWith("ytplaylist:") ||
      type === "youtube" ||
      type === "youtubePlaylist"
    );
  }

  async handle(query, context) {
    if (!this.#innertube) {
      throw new Error("YouTubeExtractor is not initialized");
    }
    const cleanQuery = query
      .replace(/^(youtube:|ytsearch:|ytplaylist:)/, "")
      .trim();

    const playlistId = this.#extractPlaylistId(cleanQuery);
    const videoId = this.#extractVideoId(cleanQuery);

    if (playlistId) {
      if (playlistId.startsWith("RD") || playlistId.startsWith("UL")) {
        const mixRes = await this.#handleDynamicMix(
          playlistId,
          videoId,
          context
        );
        if (mixRes.tracks?.length > 0) return mixRes;
      } else {
        const playlistRes = await this.#handleDirectPlaylist(
          playlistId,
          context
        );
        if (playlistRes.tracks?.length > 0) return playlistRes;
      }
    }

    if (videoId) {
      return this.#handleDirectVideo(videoId, context);
    }

    return this.#handleSearch(cleanQuery, context);
  }

  async stream(track) {
    if (!this.#innertube) {
      throw new Error("YouTubeExtractor is not initialized");
    }
    if (track.errorAttempts > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const videoId = this.#extractVideoId(track.url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    let poToken;
    try {
      poToken = await getPoToken(this.#innertube, videoId);
    } catch {
      poToken = null;
    }

    let info;
    try {
      info = await this.#innertube.getBasicInfo(videoId, {
        client: "YTMUSIC"
      });
    } catch {
      info = await this.#innertube.getBasicInfo(videoId, { client: "MWEB" });
    }

    const audio = info.chooseFormat({ type: "audio", quality: "best" });
    if (!audio) {
      throw new Error("No suitable audio format found");
    }

    let url = await audio.decipher(this.#innertube.session.player);
    if (poToken) {
      const urlObj = new URL(url);
      urlObj.searchParams.set("pot", poToken);
      url = urlObj.toString();
    }

    return url;
  }

  async getRelatedTracks(track) {
    if (!this.#innertube) {
      throw new Error("YouTubeExtractor is not initialized");
    }
    const videoId = this.#extractVideoId(track.url);
    if (!videoId) return this.createResponse();

    try {
      const videoInfo = await this.#innertube.getBasicInfo(videoId);
      const feed = videoInfo.watch_next_feed || [];
      const relatedVideos = feed.filter((item) => item.type === "CompactVideo");
      const tracks = [];
      for (const video of relatedVideos.slice(0, MAX_RELATED_TRACKS)) {
        const props = this.#extractVideoProperties(video);
        if (!props.videoId) continue;
        const relatedTrack = this.#createTrackFromProps(
          props,
          track.requestedBy,
          video
        );
        tracks.push(relatedTrack);
      }
      return this.createResponse(null, tracks);
    } catch {
      return this.createResponse();
    }
  }

  async #handleDynamicMix(playlistId, videoId, context) {
    try {
      const nextData = await this.#innertube.actions.execute("/next", {
        videoId: videoId || void 0,
        playlistId
      });
      const plData =
        nextData.data.contents?.twoColumnWatchNextResults?.playlist?.playlist;
      if (!plData || !Array.isArray(plData.contents)) {
        return this.createResponse();
      }

      const tracks = [];
      for (const item of plData.contents) {
        const r = item.playlistPanelVideoRenderer;
        if (!r || !r.videoId) continue;
        const title =
          r.title?.simpleText || r.title?.runs?.[0]?.text || "Unknown";
        const author =
          r.shortBylineText?.runs?.[0]?.text ||
          r.longBylineText?.runs?.[0]?.text ||
          "Unknown";
        const duration = r.lengthText?.simpleText || "0:00";
        const thumbnail = r.thumbnail?.thumbnails?.[0]?.url || "";

        const track = new Track(this.context.player, {
          title,
          author,
          url: `https://youtube.com/watch?v=${r.videoId}`,
          duration,
          thumbnail,
          views: 0,
          requestedBy: context.requestedBy,
          source: "youtube",
          raw: item
        });
        track.extractor = this;
        tracks.push(track);
      }

      if (!tracks.length) return this.createResponse();

      const playlistTitle = plData.title || "YouTube Mix";
      const discordPlayerPlaylist = new Playlist(this.context.player, {
        title: playlistTitle,
        author: {
          name: tracks[0]?.author || "YouTube",
          url: ""
        },
        type: "playlist",
        url:
          "https://www.youtube.com/watch?" +
          `v=${videoId || tracks[0]?.id}&list=${playlistId}`,
        id: playlistId,
        source: "youtube",
        rawPlaylist: plData,
        thumbnail: tracks[0]?.thumbnail || "",
        description: playlistTitle,
        tracks
      });
      discordPlayerPlaylist.tracks = tracks;
      tracks.forEach((track) => {
        track.playlist = discordPlayerPlaylist;
      });

      return this.createResponse(discordPlayerPlaylist, tracks);
    } catch {
      return this.createResponse();
    }
  }

  async #handleDirectPlaylist(playlistId, context) {
    try {
      const youtubePlaylist = await this.#innertube.getPlaylist(playlistId);
      if (!youtubePlaylist) return this.createResponse();

      let continuationCount = 0;
      while (
        youtubePlaylist.has_continuation &&
        (youtubePlaylist.videos?.length || 0) < MAX_PLAYLIST_TRACKS &&
        continuationCount < 2
      ) {
        await youtubePlaylist.getContinuation();
        continuationCount++;
      }

      const rawVideos = (youtubePlaylist.videos || []).slice(
        0,
        MAX_PLAYLIST_TRACKS
      );
      const tracks = [];
      for (const video of rawVideos) {
        const props = this.#extractVideoProperties(video);
        if (!props.videoId) continue;
        const track = this.#createTrackFromProps(
          props,
          context.requestedBy,
          video
        );
        tracks.push(track);
      }

      const playlistTitle =
        youtubePlaylist.info?.title?.toString() ||
        youtubePlaylist.info?.title ||
        "Unknown";
      const playlistAuthorName =
        youtubePlaylist.info?.author?.name ||
        youtubePlaylist.info?.author?.toString() ||
        "Unknown";

      const discordPlayerPlaylist = new Playlist(this.context.player, {
        title: playlistTitle,
        author: {
          name: playlistAuthorName,
          url: youtubePlaylist.info?.author?.url || ""
        },
        type: "playlist",
        url: `https://www.youtube.com/playlist?list=${playlistId}`,
        id: playlistId,
        source: "youtube",
        rawPlaylist: youtubePlaylist,
        thumbnail: youtubePlaylist.info?.thumbnails?.[0]?.url || "",
        description: youtubePlaylist.info?.description || "",
        tracks
      });
      discordPlayerPlaylist.tracks = tracks;
      tracks.forEach((track) => {
        track.playlist = discordPlayerPlaylist;
      });

      return this.createResponse(discordPlayerPlaylist, tracks);
    } catch {
      return this.createResponse();
    }
  }

  async #handleDirectVideo(videoId, context) {
    const videoInfo = await this.#innertube.getBasicInfo(videoId);
    if (!videoInfo.basic_info) return this.createResponse();
    const basicInfo = videoInfo.basic_info;
    const title = basicInfo.title?.toString() || basicInfo.title || "Unknown";
    const author =
      basicInfo.author?.toString() || basicInfo.author || "Unknown";
    const thumbnail =
      basicInfo.thumbnail?.[0]?.url || basicInfo.thumbnails?.[0]?.url || "";

    const track = new Track(this.context.player, {
      title,
      author,
      url: `https://youtube.com/watch?v=${videoId}`,
      duration: this.#parseDuration(basicInfo.duration || 0),
      thumbnail,
      views: basicInfo.view_count || 0,
      requestedBy: context.requestedBy,
      source: "youtube",
      raw: videoInfo
    });
    track.extractor = this;
    return this.createResponse(null, [track]);
  }

  async #handleSearch(query, context) {
    try {
      const searchResults = await this.#innertube.search(query, {
        type: "video"
      });
      const videos = searchResults.videos || [];
      const tracks = [];
      for (const video of videos.slice(0, MAX_SEARCH_RESULTS)) {
        const props = this.#extractVideoProperties(video);
        if (!props.videoId) continue;
        const track = this.#createTrackFromProps(
          props,
          context.requestedBy,
          video
        );
        tracks.push(track);
      }
      return this.createResponse(null, tracks);
    } catch {
      return this.createResponse();
    }
  }

  #extractVideoProperties(video) {
    const videoId = video.id || video.content_id || video.video_id || null;

    const title =
      video.title?.text ||
      video.title?.toString() ||
      video.metadata?.title?.text ||
      video.metadata?.title?.toString() ||
      "Unknown";

    const author = this.#extractAuthor(video);
    const thumbnail =
      video.thumbnails?.[0]?.url ||
      video.thumbnail?.[0]?.url ||
      video.content_image?.image?.[0]?.url ||
      "";

    const duration = this.#extractDuration(video);
    const rawViews =
      video.view_count?.text ||
      video.views?.text ||
      video.view_count?.toString() ||
      video.metadata?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text
        ?.text ||
      "0";
    const views = Number.parseInt(
      String(rawViews).replace(/\D/g, "") || "0",
      10
    );

    return {
      videoId,
      title,
      author,
      thumbnail,
      duration,
      views
    };
  }

  #extractAuthor(video) {
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

  #extractDuration(video) {
    if (
      typeof video.duration?.seconds === "number" &&
      video.duration.seconds > 0
    ) {
      return this.#parseDuration(video.duration.seconds);
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
        if (totalSecs > 0) return this.#parseDuration(totalSecs);
      }
    }
    return "0:00";
  }

  #createTrackFromProps(props, requestedBy, raw) {
    const track = new Track(this.context.player, {
      title: props.title,
      author: props.author,
      url: `https://youtube.com/watch?v=${props.videoId}`,
      duration: props.duration,
      thumbnail: props.thumbnail,
      views: props.views,
      requestedBy,
      source: "youtube",
      raw
    });
    track.extractor = this;
    return track;
  }

  #extractVideoId(url) {
    const match = url.match(YOUTUBE_URL_REGEX);
    return match?.[1] || null;
  }

  #extractPlaylistId(url) {
    const match = url.match(YOUTUBE_PLAYLIST_REGEX);
    return match?.[1] || null;
  }

  #parseDuration(seconds) {
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
}

module.exports = {
  YouTubeExtractor
};
