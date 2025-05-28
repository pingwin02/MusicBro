const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
  PresenceUpdateStatus
} = require("discord.js");
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const { Player } = require("discord-player");
const { YoutubeiExtractor } = require("discord-player-youtubei");
const utils = require("./utils");

require("dotenv").config();

const LOAD_SLASH = process.argv.includes("load");
const DEV = process.argv.includes("dev");

const TOKEN = DEV ? process.env.TOKEN_DEV : process.env.TOKEN;
const CLIENT_ID = DEV ? process.env.CLIENT_ID_DEV : process.env.CLIENT_ID;
const ADMIN_ID = process.env.ADMIN_ID;

if (!TOKEN || !CLIENT_ID || !ADMIN_ID) {
  utils.logInfo(
    "Environment variables",
    new Error(
      "Missing TOKEN, CLIENT_ID or ADMIN_ID in .env file. " +
        "Please add them and try again."
    )
  );
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

if (fs.existsSync("logs/debug.log")) {
  fs.unlinkSync("logs/debug.log");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  presence: {
    activities: [{ name: "/play", type: ActivityType.Listening }],
    status: PresenceUpdateStatus.Online
  }
});

const player = new Player(client);

player.extractors.register(YoutubeiExtractor, {
  generateWithPoToken: true,
  streamOptions: {
    useClient: "WEB_EMBEDDED",
    highWaterMark: 10 * 1024 * 1024
  }
});

client.slashcommands = new Collection();
const commands = [];
const slashFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of slashFiles) {
  const slashcmd = require(`./commands/${file}`);
  if ("data" in slashcmd && "run" in slashcmd) {
    client.slashcommands.set(slashcmd.data.name, slashcmd);
  } else {
    utils.logInfo(
      "Loading slash commands",
      new Error(
        `The command at ./commands/${file} is missing ` +
          "a required \"data\" or \"run\" property."
      )
    );
  }
  if (LOAD_SLASH) commands.push(slashcmd.data.toJSON());
}

client.buttoncommands = new Collection();
const buttonFiles = fs
  .readdirSync("./buttons")
  .filter((file) => file.endsWith(".js"));
for (const file of buttonFiles) {
  const buttoncmd = require(`./buttons/${file}`);
  if ("name" in buttoncmd && "run" in buttoncmd) {
    client.buttoncommands.set(buttoncmd.name, buttoncmd);
  } else {
    utils.logInfo(
      "Loading button commands",
      new Error(
        `The command at ./buttons/${file} is missing ` +
          "a required \"name\" or \"run\" property."
      )
    );
  }
}

if (LOAD_SLASH) {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  (async () => {
    try {
      utils.logInfo(
        `Started refreshing ${commands.length} application (/) commands.`
      );
      const data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands
      });
      utils.logInfo(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (error) {
      utils.logInfo("Reloading slash commands", error);
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  })();
} else {
  utils.loadEvents(client, "./events/client");
  utils.loadEvents(player, "./events/player");
  utils.loadEvents(player.events, "./events/player.events");
  utils.loadEvents(process, "./events/process");

  client.login(TOKEN).catch((err) => {
    utils.logInfo("Logging in", err);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}
