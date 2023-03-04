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
const { Player } = require("discord-player");

dotenv.config();
const TOKEN = process.env.TOKEN;

const LOAD_SLASH = process.argv[2] == "load";

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ERROR_TIMEOUT = 5000;
const INFO_TIMEOUT = 15000;
const QUEUE_TIMEOUT = 30000;

module.exports = {
  printError,
  sendError,
  printNowPlaying,
  printTrackInfo,
  printInfo,
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
      console.log(`ERROR: ${err}`);
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
    return console.log(
      `${currentdate} - ${user.username}#${user.discriminator} (${user.id}) used ${commandName} command in DMs`
    );
  return console.log(
    `${currentdate} - ${user.username}#${user.discriminator} (${user.id}) used ${commandName} command in ${message.channel.name} (${message.channel.id}) at ${message.guild.name} (${message.guild.id})`
  );
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
  let bar = queue.createProgressBar({
    queue: false,
    length: 19,
    timecodes: true,
  });

  let embed = new EmbedBuilder()
    .setTitle(
      "Teraz gra" +
        (queue.repeatMode == 1 ? " (:repeat_one: powtarzanie utworu)" : "") +
        (queue.repeatMode == 2 ? " (:repeat: powtarzanie całej kolejki)" : "") +
        (queue.connection.paused ? "\n(:pause_button: wstrzymane)" : "")
    )
    .setDescription(
      `[**${queue.current.title}**](${queue.current.url})\n Kanał **${queue.current.author}**\n *dodane przez <@${queue.current.requestedBy.id}>* \n\n**Postęp:**\n${bar} `
    )
    .setThumbnail(queue.current.thumbnail)
    .setFooter({ text: `Głośność: ${queue.volume}` })
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
        console.log(`ERROR: ${err}`);
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
        !channel.permissionsFor(client.user).has("SendMessages") ||
        !channel.permissionsFor(client.user).has("ViewChannel")
      ) {
        return interaction.reply({
          content: ":x: Nie mam uprawnień do wysyłania wiadomości",
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

  client.player.on("connectionCreate", (queue) => {
    queue.connection.voiceConnection.on("stateChange", (oldState, newState) => {
      const oldNetworking = Reflect.get(oldState, "networking");
      const newNetworking = Reflect.get(newState, "networking");
      const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
        const newUdp = Reflect.get(newNetworkState, "udp");
        clearInterval(newUdp?.keepAliveInterval);
      };
      oldNetworking?.off("stateChange", networkStateChangeHandler);
      newNetworking?.on("stateChange", networkStateChangeHandler);
    });
  });

  client.player.on("trackStart", (queue, track) => {
    //if (!client.config.opt.loopMessage && queue.repeatMode !== 0) return;
    printNowPlaying(queue.metadata, queue, false);
  });

  client.player.on("trackAdd", (queue, track) => {
    console.log(`Track ${track.title} (${track.url}) added in the queue`);
  });

  client.player.on("botDisconnect", (queue) => {
    console.log(`Bot was disconnected from ${queue.guild.name}`);
  });

  client.player.on("error", (queue, error) => {
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
        console.log(`ERROR: ${err}`);
      });
  });

  client.player.on("connectionError", (queue, error) => {
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
        console.log(`ERROR: ${err}`);
      });
  });

  client.player.on("channelEmpty", (queue) => {
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
        console.log(`ERROR: ${err}`);
      });
  });

  client.player.on("queueEnd", (queue) => {
    queue.metadata
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "<:jakiedy1:801039061540012052> Kolejka się skończyła, więc wychodzę z kanału głosowego!"
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
        console.log(`ERROR: ${err}`);
      });
  });

  client.login(TOKEN);
}
