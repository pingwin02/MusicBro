const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
} = require("discord.js");
const dotenv = require("dotenv");
const { REST, Routes, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const { Player } = require("discord-player");

dotenv.config();
const TOKEN = process.env.TOKEN;

const LOAD_SLASH = process.argv[2] == "load";

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

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

client.slashcommands = new Collection();
client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

client.player.on("error", (queue, error) => {
  queue.metadata.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Coś się zepsuło <:sus:833956789421735976>`)
        .setDescription(`Spróbuj ponownie później!\n Błąd: \`${error}\``)
        .setColor("Red"),
    ],
  });
});

client.player.on("connectionError", (queue, error) => {
  queue.metadata.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Coś się zepsuło <:sus:833956789421735976>`)
        .setDescription(`Spróbuj ponownie później!\n Błąd: \`${error}\``)
        .setColor("Red"),
    ],
  });
});

client.player.on("trackStart", (queue, track) => {
  //if (!client.config.opt.loopMessage && queue.repeatMode !== 0) return;
  let bar = queue.createProgressBar({
    queue: false,
    length: 19,
    timecodes: true,
  });

  queue.metadata
    .send({
      embeds: [
        new EmbedBuilder()
          .setTitle("Teraz gra:")
          .setDescription(
            `[**${track.title}**](${track.url})\n Kanał **${track.author}** \n\n**Postęp:**\n${bar} `
          )
          .setThumbnail(track.thumbnail)
          .setFooter({ text: `Głośność: ${queue.volume}` }),
      ],
    })
    .then((msg) => {
      setTimeout(() => msg.delete(), 20000);
    });
});

client.player.on("trackAdd", (queue, track) => {
  console.log(`Track ${track.title} added in the queue`);
});

client.player.on("botDisconnect", (queue) => {
  queue.metadata
    .send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            `"Zostałem wywalony z kanału głosowego! <:jakiedy1:801039061540012052>"`
          )
          .setColor("Red"),
      ],
    })
    .then((msg) => {
      setTimeout(() => msg.delete(), 10000);
    });
});

client.player.on("channelEmpty", (queue) => {
  queue.metadata
    .send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            "Nie ma już nikogo, więc wychodzę z kanału głosowego! :crying_cat_face:"
          )
          .setColor("Red"),
      ],
    })
    .then((msg) => {
      setTimeout(() => msg.delete(), 10000);
    });
});

client.player.on("queueEnd", (queue) => {
  queue.metadata
    .send("Kolejka się skończyła, więc wychodzę z kanału głosowego! ")
    .then((msg) => {
      setTimeout(() => msg.delete(), 10000);
    });
});

function printMessage(message) {
  var currentdate = new Date()
    .toISOString()
    .replace(/T/, " ") // replace T with a space
    .replace(/\..+/, ""); // delete the dot and everything after

  let user = message.author;
  if (message.author === undefined) user = message.user;

  let commandName = message.commandName;
  if (commandName === undefined) commandName = message.content;

  if (message.guild === null)
    return console.log(
      `${currentdate} - ${user.username}#${user.discriminator} (${user.id}) used ${commandName} command in DMs`
    );
  return console.log(
    `${currentdate} - ${user.username}#${user.discriminator} (${user.id}) used ${commandName} command in ${message.channel.name} (${message.channel.id}) at ${message.guild.name} (${message.guild.id})`
  );
}

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

if (LOAD_SLASH) {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  (async () => {
    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands.`
      );
      const data = await rest.put(
        Routes.applicationCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
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
  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
      activities: [{ name: `/add`, type: ActivityType.Listening }],
      status: "online",
    });
  });

  client.on("interactionCreate", (interaction) => {
    async function handleCommand() {
      if (!interaction.isCommand()) return;

      printMessage(interaction);

      const slashcmd = client.slashcommands.get(interaction.commandName);
      if (!slashcmd) interaction.reply("Command not found");

      await slashcmd.run({ client, interaction });
    }
    handleCommand();
  });

  client.on("messageCreate", (message) => {
    if (message.content === "!!clear") {
      printMessage(message);
      const channel = message.client.channels.cache.get(
        message.channelId.toString()
      );

      const toDelete = [];

      channel.messages.fetch({ limit: 100 }).then((messages) => {
        messages.forEach((element) => {
          if (element.author.id === message.client.user.id)
            toDelete.push(element.id);
        });
        if (toDelete.length === 0) {
          message
            .reply({
              content: `Nie znaleziono żadnych wiadomości do usunięcia`,
              ephemeral: true,
            })
            .then((msg) => {
              setTimeout(() => msg.delete(), 3000);
            });
        } else {
          message.client.channels.fetch(message.channelId).then((chl) => {
            toDelete.forEach((msgid) => {
              chl.messages.delete(msgid);
            });

            message
              .reply({
                content: `Usunąłem **${toDelete.length}** moich wiadomości`,
                ephemeral: true,
              })
              .then((msg) => {
                setTimeout(() => msg.delete(), 3000);
              });
          });
        }
        if (message.guild) setTimeout(() => message.delete(), 4000);
      });
    }
  });
  client.login(TOKEN);
}
