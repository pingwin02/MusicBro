const assert = require("node:assert/strict");
const test = require("node:test");
const { isTestEnvironment } = require("../utils/logger");
const { LYRICS_USER_AGENT } = require("../utils/constants");
const {
  fetchTrackLyrics,
  findBestLyricsMatch,
  handleLyrics,
  parseRetryAfterHeader,
  parseTrackForLyrics,
  prefetchLyrics,
  searchLyricsWithRetry,
  setupLyricsClient,
  setupLyricsUserAgent
} = require("../utils/lyrics");

test(
  "parseTrackForLyrics - cleans bracketed video metadata",
  { concurrency: true },
  () => {
    const track = {
      title: "Nelly Furtado - Promiscuous (Official Music Video) ft. Timbaland",
      author: "Nelly Furtado"
    };

    const parsed = parseTrackForLyrics(track);
    assert.equal(parsed.author, "Nelly Furtado");
    assert.equal(parsed.title, "Promiscuous ft. Timbaland");
    assert.equal(parsed.cleanTitle, "Promiscuous");
    assert.equal(parsed.rawTitle, track.title);
  }
);

test(
  "parseTrackForLyrics - handles square brackets and tags",
  { concurrency: true },
  () => {
    const track = {
      title: "Eminem - Lose Yourself [Official Music Video]",
      author: "EminemMusic"
    };

    const parsed = parseTrackForLyrics(track);
    assert.equal(parsed.author, "Eminem");
    assert.equal(parsed.title, "Lose Yourself");
    assert.equal(parsed.cleanTitle, "Lose Yourself");
  }
);

test(
  "parseTrackForLyrics - cleans Topic and VEVO channel suffixes",
  { concurrency: true },
  () => {
    const trackTopic = {
      title: "Blinding Lights",
      author: "The Weeknd - Topic"
    };
    const parsedTopic = parseTrackForLyrics(trackTopic);
    assert.equal(parsedTopic.author, "The Weeknd");
    assert.equal(parsedTopic.title, "Blinding Lights");
    assert.equal(parsedTopic.cleanTitle, "Blinding Lights");

    const trackVevo = {
      title: "Roar",
      author: "KatyPerryVEVO"
    };
    const parsedVevo = parseTrackForLyrics(trackVevo);
    assert.equal(parsedVevo.author, "KatyPerry");
    assert.equal(parsedVevo.title, "Roar");
    assert.equal(parsedVevo.cleanTitle, "Roar");
  }
);

test(
  "parseTrackForLyrics - handles feat in artist segment",
  { concurrency: true },
  () => {
    const track = {
      title: "David Guetta feat. Sia - Titanium (Official Video)",
      author: "David Guetta"
    };

    const parsed = parseTrackForLyrics(track);
    assert.equal(parsed.author, "David Guetta feat. Sia");
    assert.equal(parsed.title, "Titanium");
    assert.equal(parsed.cleanTitle, "Titanium");
  }
);

test(
  "parseTrackForLyrics - handles null or empty track gracefully",
  { concurrency: true },
  () => {
    assert.deepEqual(parseTrackForLyrics(null), {
      title: "",
      author: "",
      cleanTitle: "",
      rawTitle: ""
    });
    assert.deepEqual(parseTrackForLyrics({}), {
      title: "",
      author: "",
      cleanTitle: "",
      rawTitle: ""
    });
  }
);

test(
  "handleLyrics - returns undefined when no track exists",
  { concurrency: true },
  async () => {
    const res = await handleLyrics({});
    assert.equal(res, undefined);
  }
);

test(
  "isTestEnvironment - returns true in test environment",
  { concurrency: true },
  () => {
    assert.equal(isTestEnvironment(), true);
  }
);

test(
  "searchLyricsWithRetry - retries on ServerOverloaded and succeeds",
  { concurrency: true },
  async () => {
    let calls = 0;
    const mockPlayer = {
      lyrics: {
        search: async () => {
          calls++;
          if (calls === 1) {
            const err = new Error("The server is busy");
            err.name = "ServerOverloaded";
            throw err;
          }
          return [{ plainLyrics: "Test lyrics", trackName: "Test" }];
        }
      }
    };

    const res = await searchLyricsWithRetry(mockPlayer, { q: "test" }, 10, 2);
    assert.equal(calls, 2);
    assert.equal(res[0].plainLyrics, "Test lyrics");
  }
);

test(
  "searchLyricsWithRetry - throws after exceeding max retries",
  { concurrency: true },
  async () => {
    let calls = 0;
    const mockPlayer = {
      lyrics: {
        search: async () => {
          calls++;
          const err = new Error("The server is busy");
          err.name = "ServerOverloaded";
          throw err;
        }
      }
    };

    await assert.rejects(
      async () => {
        await searchLyricsWithRetry(mockPlayer, { q: "test" }, 10, 2);
      },
      { name: "ServerOverloaded" }
    );
    assert.equal(calls, 3);
  }
);

test(
  "searchLyricsWithRetry - throws immediately on non-overload error",
  { concurrency: true },
  async () => {
    let calls = 0;
    const mockPlayer = {
      lyrics: {
        search: async () => {
          calls++;
          throw new Error("Invalid query");
        }
      }
    };

    await assert.rejects(
      async () => {
        await searchLyricsWithRetry(mockPlayer, { q: "test" }, 10, 2);
      },
      { message: "Invalid query" }
    );
    assert.equal(calls, 1);
  }
);

test(
  "setupLyricsUserAgent - sets custom User-Agent on player.lyrics.request",
  { concurrency: true },
  async () => {
    let capturedHeaders = null;
    const mockPlayer = {
      lyrics: {
        request: async (_path, options) => {
          capturedHeaders = options?.headers;
          return [];
        }
      }
    };

    setupLyricsUserAgent(mockPlayer);
    await mockPlayer.lyrics.request("search?q=test");
    assert.equal(capturedHeaders?.["User-Agent"], LYRICS_USER_AGENT);
  }
);

test(
  "parseTrackForLyrics - preserves featured artists in parentheses",
  { concurrency: true },
  () => {
    const track = {
      title: "Morning After Dark (Featuring Nelly Furtado & SoShy)",
      author: "Timbaland - Topic"
    };

    const parsed = parseTrackForLyrics(track);
    assert.equal(parsed.author, "Timbaland");
    assert.equal(
      parsed.title,
      "Morning After Dark (Featuring Nelly Furtado & SoShy)"
    );
    assert.equal(parsed.cleanTitle, "Morning After Dark");
    assert.equal(parsed.rawTitle, track.title);
  }
);

test(
  "findBestLyricsMatch - selects best candidate based on duration and sync",
  { concurrency: true },
  () => {
    const candidates = [
      {
        id: 1,
        trackName: "Morning After Dark",
        artistName: "Timbaland",
        duration: 215,
        syncedLyrics: "[00:15.74] Go Timbo"
      },
      {
        id: 2,
        trackName: "Morning After Dark (Featuring Nelly Furtado & SoShy)",
        artistName: "Timbaland feat. Nelly Furtado & SoShy",
        duration: 233,
        syncedLyrics: "[00:06.29] Go Timbo"
      },
      {
        id: 3,
        trackName: "Morning After Dark",
        artistName: "Timbaland",
        duration: 232,
        plainLyrics: "Go Timbo"
      }
    ];

    const match = findBestLyricsMatch(candidates, {
      targetDuration: 232,
      rawTitle: "Morning After Dark (Featuring Nelly Furtado & SoShy)",
      title: "Morning After Dark (Featuring Nelly Furtado & SoShy)",
      cleanTitle: "Morning After Dark",
      author: "Timbaland"
    });

    assert.equal(match.id, 2);
  }
);

test(
  "findBestLyricsMatch - handles empty or invalid candidates gracefully",
  { concurrency: true },
  () => {
    assert.equal(findBestLyricsMatch([]), null);
    assert.equal(findBestLyricsMatch(null), null);
    assert.equal(findBestLyricsMatch([{ id: 1 }]), null);
  }
);

test(
  "fetchTrackLyrics - returns cached lyrics result if already resolved",
  { concurrency: true },
  async () => {
    const cachedResult = { plainLyrics: "Cached lyrics", trackName: "Test" };
    const track = {
      title: "Test",
      _lyricsResult: cachedResult
    };
    const res = await fetchTrackLyrics(null, track);
    assert.deepEqual(res, cachedResult);
  }
);

test(
  "fetchTrackLyrics - handles null track gracefully",
  { concurrency: true },
  async () => {
    const res = await fetchTrackLyrics(null, null);
    assert.equal(res, null);
  }
);

test(
  "prefetchLyrics - does nothing if track already has result or promise",
  { concurrency: true },
  () => {
    const track = { title: "Test", _lyricsResult: {} };
    assert.doesNotThrow(() => prefetchLyrics(track));
  }
);

test(
  "parseRetryAfterHeader - parses seconds and dates correctly",
  { concurrency: true },
  () => {
    assert.equal(parseRetryAfterHeader("1"), 1000);
    assert.equal(parseRetryAfterHeader("2.5"), 2500);
    assert.equal(parseRetryAfterHeader(null), null);
    assert.equal(parseRetryAfterHeader(""), null);
    assert.equal(parseRetryAfterHeader("invalid"), null);
  }
);

test(
  "setupLyricsClient - extracts Retry-After header into error.retryAfterMs",
  { concurrency: true },
  async () => {
    const mockBucket = {
      _request: async (req) => {
        await req();
        const err = new Error("The server is busy");
        err.name = "ServerOverloaded";
        throw err;
      }
    };
    const mockPlayer = {
      lyrics: {
        bucket: mockBucket,
        request: async () => {}
      }
    };

    setupLyricsClient(mockPlayer);

    const fakeReq = async () => ({
      ok: false,
      status: 503,
      headers: new Map([["retry-after", "2"]])
    });

    await assert.rejects(
      async () => {
        await mockBucket._request(fakeReq);
      },
      (err) => {
        assert.equal(err.name, "ServerOverloaded");
        assert.equal(err.retryAfterMs, 2000);
        return true;
      }
    );
  }
);
