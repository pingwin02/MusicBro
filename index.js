const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require("discord.js");

const dotenv = require("dotenv");
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const { Player } = require("discord-player");

// Load environment variables
dotenv.config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.log(
    "[ERROR] Missing TOKEN or CLIENT_ID in .env file. Please add them and try again."
  );
  process.exit(1);
}

const LOAD_SLASH = process.argv[2] == "load";

// Create logs folder if it doesn't exist
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
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
});

// Create Discord player
client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

// Load default extractors
client.player.extractors.loadDefault();

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

// If deploy argument is passed, load slash commands and exit
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
  const eventFiles = fs
    .readdirSync("./events")
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const event = require(`./events/${file}`);

    var receiver = client;
    if (event.type == "player") {
      receiver = client.player.events;
    } else if (event.type == "process") {
      receiver = process;
    }

    if (event.once) {
      receiver.once(event.name, (...args) => event.execute(...args));
    } else {
      receiver.on(event.name, (...args) => event.execute(...args));
    }
  }

  // Login to Discord
  client.login(TOKEN);
}
