const { Events } = require("discord.js");
const utils = require("../../utils");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (message.content === "!!clear") {
        utils.logInfo(`Messages cleared by @${message.author.username}`);
        const channel = message.client.channels.cache.get(
          message.channelId.toString()
        );
        const toDelete = [];
        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach((msg) => {
          if (msg.author.id === message.client.user.id) toDelete.push(msg.id);
        });
        if (toDelete.length === 0) {
          const msg1 = await message.reply({
            content: "Nie znaleziono żadnych wiadomości do usunięcia"
          });
          utils.timedDelete(msg1);
        } else {
          toDelete.forEach((msg) => {
            utils.timedDelete(channel.messages.cache.get(msg), 0);
          });

          const msg2 = await message.reply({
            content: `Usunąłem **${toDelete.length}** moich wiadomości`
          });
          utils.timedDelete(msg2);
        }
        if (message.guild) utils.timedDelete(message);
      } else if (
        message.content === "!!avatar_update" &&
        message.author.id === process.env.ADMIN_ID
      ) {
        await message.react("⌚");
        message.client.user.setAvatar("img/bot_logo_anim.gif");
        message.client.user.setBanner("img/bot_banner_anim.gif");
        await message.reactions.removeAll();
        await message.react("✅");
      }
    } catch (err) {
      utils.logInfo(`${message.content} message`, err);
    }
  }
};
