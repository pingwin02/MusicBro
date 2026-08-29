const { Track } = require("discord-player");
const { faker } = require("@faker-js/faker");

function createMockTrack(player, overrides = {}) {
  const title = overrides.title || faker.music.songName();
  return new Track(player, {
    author: overrides.author || faker.person.fullName(),
    description: overrides.description || title,
    duration: overrides.duration || "3:30",
    requestedBy: overrides.requestedBy || null,
    source: overrides.source || "youtube",
    thumbnail: overrides.thumbnail || faker.image.url(),
    title,
    url:
      overrides.url ||
      `https://youtube.com/watch?v=${faker.string.alphanumeric(11)}`,
    views: overrides.views || faker.number.int({ max: 1000000, min: 1000 }),
    ...overrides
  });
}

function createMockTracks(player, count = 3, prefix = "Track") {
  const tracks = [];
  for (let i = 1; i <= count; i++) {
    tracks.push(
      createMockTrack(player, {
        title: prefix ? `${prefix} ${i}` : faker.music.songName()
      })
    );
  }
  return tracks;
}

module.exports = {
  createMockTrack,
  createMockTracks
};
