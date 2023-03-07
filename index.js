const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
} = require("discord.js");
const dotenv = require("dotenv");
const { REST, Routes, EmbedBuilder, Events } = require("discord.js");
const fs = require("fs");
const { Console } = require("console");
const { Player, GuildQueueEvent } = require("discord-player");

dotenv.config();
const TOKEN = process.env.TOKEN;

const LOAD_SLASH = process.argv[2] == "load";

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ERROR_TIMEOUT = 5000;
const INFO_TIMEOUT = 15000;
const QUEUE_TIMEOUT = 30000;

const logger = new Console({
  stdout: fs.createWriteStream("logs/log.log", { start: 0 }),
  stderr: fs.createWriteStream("logs/error.log", { start: 0 }),
});

const debug = new Console({
  stdout: fs.createWriteStream("logs/debug.log", { start: 0 }),
});

module.exports = {
  printError,
  sendError,
  printNowPlaying,
  printTrackInfo,
  printInfo,
  logger,
  ERROR_TIMEOUT,
  INFO_TIMEOUT,
  QUEUE_TIMEOUT,
};

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

function sendError(title, err, interaction) {
  interaction.channel
    .send(`:x: Wystąpił nieoczekiwany błąd: ${title}\n\`${err}\``)
    .catch((err) => {
      logger.error(`ERROR: ${err}`);
    });
}

function printMessage(message) {
  var currentdate = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/, "");

  let user = message.author;
  if (message.author === undefined) user = message.user;

  let commandName = message.commandName;
  if (commandName === undefined) commandName = message.content;

  if (message.guild === null)
    return logger.log(
      `${currentdate} - ${user.username}#${user.discriminator} (${user.id}) used ${commandName} command in DMs`
    );
  return logger.log(
    `${currentdate} - ${user.username}#${user.discriminator} (${user.id}) used ${commandName} command in ${message.channel.name} (${message.channel.id}) at ${message.guild.name} (${message.guild.id})`
  );
}

function logInfo(info, error) {
  var currentdate = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/, "");
  if (error) return logger.error(`${currentdate} - ${info}`);
  return logger.log(`${currentdate} - ${info}`);
}

function printError(interaction, error) {
  return interaction
    .editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(":x: Błąd!")
          .setDescription(error)
          .setColor("Red"),
      ],
    })
    .then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            sendError("Kasowanie wiadomości", err, interaction);
          }),
        ERROR_TIMEOUT
      );
    });
}

function printNowPlaying(interaction, queue, reply) {
  let bar = queue.node.createProgressBar({
    queue: false,
    length: 19,
    timecodes: true,
  });

  let embed = new EmbedBuilder()
    .setTitle(
      "Teraz gra" +
        (queue.repeatMode == 1 ? " (:repeat_one: powtarzanie utworu)" : "") +
        (queue.repeatMode == 2 ? " (:repeat: powtarzanie całej kolejki)" : "") +
        (queue.node.isPaused() ? "\n(:pause_button: wstrzymane)" : "")
    )
    .setDescription(
      `[**${queue.currentTrack.title}**](${queue.currentTrack.url})\n Kanał **${queue.currentTrack.author}**\n *dodane przez <@${queue.currentTrack.requestedBy.id}>* \n\n**Postęp:**\n${bar} `
    )
    .setThumbnail(queue.currentTrack.thumbnail)
    .setFooter({ text: `Głośność: ${queue.node.volume}` })
    .setColor("Blue");

  if (!reply) {
    interaction
      .send({
        embeds: [embed],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              sendError("Kasowanie wiadomości", err, interaction);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logger.error(`ERROR: ${err}`);
      });
  } else {
    interaction
      .editReply({
        embeds: [embed],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              sendError("Kasowanie wiadomości", err, interaction);
            }),
          INFO_TIMEOUT
        );
      });
  }
}

function printTrackInfo(interaction, track, title, description) {
  return interaction
    .editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description + " :musical_note:")
          .setThumbnail(track.thumbnail)
          .setFooter({ text: `Przez ${track.requestedBy.tag}` })
          .setColor("Yellow"),
      ],
    })
    .then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            sendError("Kasowanie wiadomości", err, interaction);
          }),
        INFO_TIMEOUT
      );
    });
}

function printInfo(interaction, title, description) {
  return interaction
    .editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(title)
          .setDescription(description + " :musical_note:")
          .setFooter({ text: `Przez ${interaction.user.tag}` })
          .setColor("Green"),
      ],
    })
    .then((msg) => {
      setTimeout(
        () =>
          msg.delete().catch((err) => {
            sendError("Kasowanie wiadomości", err, interaction);
          }),
        INFO_TIMEOUT
      );
    });
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
  client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
      activities: [{ name: `/play`, type: ActivityType.Listening }],
      status: "online",
    });
  });

  client.on(Events.InteractionCreate, (interaction) => {
    async function handleCommand() {
      if (!interaction.isCommand()) return;

      printMessage(interaction);

      const channel = client.channels.cache.get(interaction.channelId);

      if (
        interaction.guild &&
        (!channel.permissionsFor(interaction.client.user).has("SendMessages") ||
          !channel.permissionsFor(interaction.client.user).has("ViewChannel"))
      ) {
        return interaction.reply({
          content:
            ":x: Nie mam uprawnień do wysyłania wiadomości lub nie widzę tego kanału",
          ephemeral: true,
        });
      }

      const slashcmd = client.slashcommands.get(interaction.commandName);
      if (!slashcmd)
        return interaction.reply(
          ":x: Wystąpił nieoczekiwany błąd: `Unknown Command`"
        );

      await slashcmd.run({ client, interaction });
    }
    handleCommand();
  });

  client.on(Events.MessageCreate, (message) => {
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
              setTimeout(
                () =>
                  msg.delete().catch((err) => {
                    sendError("Kasowanie wiadomości", err, message);
                  }),
                3000
              );
            });
        } else {
          message.client.channels.fetch(message.channelId).then((chl) => {
            toDelete.forEach((msgid) => {
              chl.messages.delete(msgid).catch((err) => {
                sendError("Kasowanie wiadomości", err, message);
              });
            });

            message
              .reply({
                content: `Usunąłem **${toDelete.length}** moich wiadomości`,
                ephemeral: true,
              })
              .then((msg) => {
                setTimeout(
                  () =>
                    msg.delete().catch((err) => {
                      sendError("Kasowanie wiadomości", err, message);
                    }),
                  3000
                );
              });
          });
        }
        if (message.guild)
          setTimeout(
            () =>
              message.delete().catch((err) => {
                sendError("Kasowanie wiadomości", err, message);
              }),
            4000
          );
      });
    }
  });

  process.on("uncaughtException", (err) => {
    logInfo("Uncaught Exception: " + err.message, true);
    process.exit(1);
  });

  client.player.events.on(GuildQueueEvent.playerStart, (queue, track) => {
    //if (!client.config.opt.loopMessage && queue.repeatMode !== 0) return;
    printNowPlaying(queue.metadata, queue, false);
  });

  client.player.events.on("audioTrackAdd", (queue, track) => {
    logInfo(
      `Track ${track.title} (${track.url}) added in the queue in ${queue.guild.name} (${queue.guild.id})`
    );
  });

  client.player.events.on(GuildQueueEvent.disconnect, (queue) => {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "<:jakiedy1:801039061540012052> Rozłączyłem się! Do usłyszenia :wave:"
            )
            .setColor("Red"),
        ],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              sendError("Kasowanie wiadomości", err, interaction);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logger.error(`ERROR: ${err}`);
      });
  });

  client.player.events.on(GuildQueueEvent.emptyQueue, (queue) => {
    logInfo(`Queue is empty in ${queue.guild.name} (${queue.guild.id})`);
  });

  client.player.events.on(GuildQueueEvent.debug, (queue, message) => {
    //debug.log(message);
  });

  client.player.events.on(GuildQueueEvent.error, (queue, error) => {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`<:sus:833956789421735976> Coś się zepsuło!`)
            .setDescription(`Spróbuj ponownie później!\n\`${error}\``)
            .setColor("Red"),
        ],
      })
      .catch((err) => {
        logger.error(`ERROR: ${err}`);
      });
  });

  client.player.events.on(GuildQueueEvent.playerError, (queue, error) => {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`<:sus:833956789421735976> Coś się zepsuło!`)
            .setDescription(`Spróbuj ponownie później!\n\`${error}\``)
            .setColor("Red"),
        ],
      })
      .catch((err) => {
        logger.error(`ERROR: ${err}`);
      });
  });

  client.player.events.on(GuildQueueEvent.emptyChannel, (queue) => {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "<:jakiedy1:801039061540012052> Nie ma już nikogo, więc wychodzę z kanału głosowego!"
            )
            .setColor("Red"),
        ],
      })
      .then((msg) => {
        setTimeout(
          () =>
            msg.delete().catch((err) => {
              sendError("Kasowanie wiadomości", err, interaction);
            }),
          INFO_TIMEOUT
        );
      })
      .catch((err) => {
        logger.error(`ERROR: ${err}`);
      });
  });

  client.login(TOKEN);
}
