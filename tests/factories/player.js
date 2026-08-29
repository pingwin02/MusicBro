process.env.NODE_ENV = "test";

const { Player } = require("discord-player");
const { Client, GatewayIntentBits } = require("discord.js");
const { Log } = require("youtubei.js");
const { YouTubeExtractor } = require("../../extractors");

Log.setLevel(Log.Level.NONE);

async function createTestPlayer(client = null) {
  const c =
    client ||
    new Client({
      intents: [GatewayIntentBits.GuildVoiceStates]
    });
  const player = new Player(c);
  await player.extractors.register(YouTubeExtractor, {});
  return { client: c, player };
}

module.exports = {
  createTestPlayer
};
