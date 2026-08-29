const { BaseExtractor, Playlist, Track } = require("discord-player");
const vm = require("node:vm");
const { Innertube, Platform, UniversalCache } = require("youtubei.js");
const {
  MAX_PLAYLIST_TRACKS,
  MAX_RELATED_TRACKS,
  MAX_SEARCH_RESULTS,
  YOUTUBE_DOMAIN_REGEX
} = require("../utils/constants");
const {
  createHttpStream,
  extractMusicSongProperties,
  extractPlaylistId,
  extractVideoId,
  extractVideoProperties,
  parseDuration
} = require("./helpers");
const { getPoToken } = require("./tokenGenerator");

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
    this.protocols = [
      "ytsearch",
      "youtube",
      "ytplaylist",
      "ytvideo",
      "general"
    ];
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
      query.startsWith("ytvideo:") ||
      query.startsWith("general:") ||
      type === "youtube" ||
      type === "youtubePlaylist"
    );
  }

  async handle(query, context) {
    if (!this.#innertube) {
      throw new Error("YouTubeExtractor is not initialized");
    }
    const isVideoOnly =
      query.startsWith("ytvideo:") ||
      query.startsWith("general:") ||
      context?.requestOptions?.mode === "general" ||
      context?.requestOptions?.searchMode === "general";

    const cleanQuery = query
      .replace(/^(youtube:|ytsearch:|ytplaylist:|ytvideo:|general:)/, "")
      .trim();

    const playlistId = extractPlaylistId(cleanQuery);
    const videoId = extractVideoId(cleanQuery);

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

    return this.#handleSearch(cleanQuery, context, isVideoOnly);
  }

  async stream(track) {
    if (!this.#innertube) {
      throw new Error("YouTubeExtractor is not initialized");
    }
    if (track.errorAttempts > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const videoId = extractVideoId(track.url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    let poToken;
    try {
      poToken = await getPoToken(this.#innertube, videoId);
    } catch {
      poToken = null;
    }

    const clients = ["YTMUSIC", "IOS", "MWEB", "WEB"];
    for (const client of clients) {
      try {
        const info = await this.#innertube.getBasicInfo(videoId, { client });
        if (info.playability_status?.status !== "OK" || !info.streaming_data) {
          continue;
        }
        const audio = info.chooseFormat({ type: "audio", quality: "best" });
        if (!audio) continue;

        let url = await audio.decipher(this.#innertube.session.player);
        if (!url) continue;

        if (poToken) {
          const urlObj = new URL(url);
          urlObj.searchParams.set("pot", poToken);
          url = urlObj.toString();
        }

        if (client === "YTMUSIC") {
          return url;
        }

        return createHttpStream(url, audio.content_length);
      } catch {
        continue;
      }
    }

    throw new Error("No suitable audio format found");
  }

  async getRelatedTracks(track) {
    if (!this.#innertube) {
      throw new Error("YouTubeExtractor is not initialized");
    }
    const videoId = extractVideoId(track.url);
    if (!videoId) return this.createResponse();

    try {
      const videoInfo = await this.#innertube.getBasicInfo(videoId);
      const feed = videoInfo.watch_next_feed || [];
      const relatedVideos = feed.filter((item) => item.type === "CompactVideo");
      const tracks = [];
      for (const video of relatedVideos.slice(0, MAX_RELATED_TRACKS)) {
        const props = extractVideoProperties(video);
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
        const props = extractVideoProperties(video);
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
      duration: parseDuration(basicInfo.duration || 0),
      thumbnail,
      views: basicInfo.view_count || 0,
      requestedBy: context.requestedBy,
      source: "youtube",
      raw: videoInfo
    });
    track.extractor = this;
    return this.createResponse(null, [track]);
  }

  async #handleSearch(query, context, isVideoOnly = false) {
    try {
      if (!isVideoOnly) {
        let musicSongs = [];
        try {
          const musicResults = await this.#innertube.music.search(query, {
            type: "song"
          });
          musicSongs =
            musicResults.songs?.contents || musicResults.contents || [];
        } catch {
          musicSongs = [];
        }

        if (Array.isArray(musicSongs) && musicSongs.length > 0) {
          const tracks = [];
          for (const song of musicSongs.slice(0, MAX_SEARCH_RESULTS)) {
            const props = extractMusicSongProperties(song);
            if (!props.videoId) continue;
            const track = this.#createTrackFromProps(
              props,
              context.requestedBy,
              song
            );
            tracks.push(track);
          }
          if (tracks.length > 0) {
            return this.createResponse(null, tracks);
          }
        }
      }

      const searchResults = await this.#innertube.search(query, {
        type: "video"
      });
      const videos = searchResults.videos || [];
      const tracks = [];
      for (const video of videos.slice(0, MAX_SEARCH_RESULTS)) {
        const props = extractVideoProperties(video);
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
}

module.exports = {
  YouTubeExtractor
};
