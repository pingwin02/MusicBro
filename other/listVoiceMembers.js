const {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits
} = require("discord.js");
require("dotenv").config({ quiet: true });

const dev = process.argv.includes("dev");
const token = dev ? process.env.TOKEN_DEV : process.env.TOKEN;
const guildId = process.argv
  .slice(2)
  .find((arg) => arg !== "dev" && /^\d+$/.test(arg));

if (!guildId) {
  process.stderr.write(
    "Usage: node other/listVoiceMembers.js <guildId> [dev]\n"
  );
  process.exit(1);
}

if (!token) {
  process.stderr.write("Missing TOKEN in .env file.\n");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

function print(message) {
  process.stdout.write(`${message}\n`);
}

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    print(`Guild: ${guild.name} (${guild.id})\n`);

    const channels = await guild.channels.fetch();
    const voiceChannels = channels.filter(
      (channel) =>
        channel &&
        (channel.type === ChannelType.GuildVoice ||
          channel.type === ChannelType.GuildStageVoice)
    );

    let totalMembers = 0;

    for (const [, channel] of voiceChannels) {
      const voiceStates = guild.voiceStates.cache.filter(
        (vs) => vs.channelId === channel.id
      );

      print(`Channel: ${channel.name} (${channel.id}) [${voiceStates.size}]`);

      if (voiceStates.size === 0) {
        print("  (Empty)");
        continue;
      }

      for (const [, state] of voiceStates) {
        totalMembers += 1;
        const member =
          state.member ||
          (await guild.members.fetch(state.id).catch(() => null));

        if (member) {
          const tag = member.user.tag || member.user.username;
          print(`  - ${member.displayName} (${tag}) [ID: ${member.id}]`);
        } else {
          print(`  - User ID: ${state.id}`);
        }
      }
    }

    print(`\nTotal connected members: ${totalMembers}`);
  } catch (error) {
    console.error("Error fetching guild voice members:", error.message);
    process.exitCode = 1;
  } finally {
    await client.destroy();
  }
});

client.login(token).catch((err) => {
  console.error("Failed to login:", err.message);
  process.exit(1);
});
