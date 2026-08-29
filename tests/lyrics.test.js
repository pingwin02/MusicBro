const assert = require("node:assert/strict");
const test = require("node:test");
const { isTestEnvironment } = require("../utils/logger");
const { handleLyrics, parseTrackForLyrics } = require("../utils/lyrics");

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
