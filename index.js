const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
  PresenceUpdateStatus,
} = require("discord.js");
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const { Player } = require("discord-player");
const { YouTubeExtractor } = require("@discord-player/extractor");
const { loadEvents } = require("./functions");

// Load environment variables
require("dotenv").config();

const LOAD_SLASH = process.argv.includes("load");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const ADMIN_ID = process.env.ADMIN_ID;

if (!TOKEN || !CLIENT_ID || !ADMIN_ID) {
  console.log(
    "[ERROR] Missing TOKEN, CLIENT_ID or ADMIN_ID in .env file. Please add them and try again."
  );
  process.exit(1);
}

// Create logs folder if it doesn't exist
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

// Delete old debug logs
if (fs.existsSync("logs/debug.log")) {
  fs.unlinkSync("logs/debug.log");
}

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  presence: {
    activities: [{ name: "/play", type: ActivityType.Listening }],
    status: PresenceUpdateStatus.Online,
  },
});

// Create Discord player
client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

// Load extractors
client.player.extractors.register(YouTubeExtractor, {});

// Load slash commands from commands folder
client.slashcommands = new Collection();
let commands = [];
const slashFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of slashFiles) {
  const slashcmd = require(`./commands/${file}`);
  if ("data" in slashcmd && "run" in slashcmd) {
    client.slashcommands.set(slashcmd.data.name, slashcmd);
  } else {
    console.log(
      `[WARNING] The command at ./commands/${file} is missing a required "data" or "run" property.`
    );
  }
  if (LOAD_SLASH) commands.push(slashcmd.data.toJSON());
}

// Load button commands from buttons folder
client.buttoncommands = new Collection();
const buttonFiles = fs
  .readdirSync("./buttons")
  .filter((file) => file.endsWith(".js"));
for (const file of buttonFiles) {
  const buttoncmd = require(`./buttons/${file}`);
  if ("name" in buttoncmd && "run" in buttoncmd) {
    client.buttoncommands.set(buttoncmd.name, buttoncmd);
  } else {
    console.log(
      `[WARNING] The button at ./buttons/${file} is missing a required "name" or "run" property.`
    );
  }
}

// If load is passed, load slash commands and exit
if (LOAD_SLASH) {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  (async () => {
    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands.`
      );
      const data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      });
      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
} else {
  // Otherwise, load events and login
  loadEvents(client, "./events/client");
  loadEvents(client.player, "./events/player");
  loadEvents(client.player.events, "./events/player.events");
  loadEvents(process, "./events/process");

  // Login to Discord
  client.login(TOKEN);
}
