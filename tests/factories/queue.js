const { createMockGuild } = require("./guild");

function createMockQueue(player, client = null, overrides = {}) {
  const guild =
    overrides.guild ||
    createMockGuild(overrides.guildId ? { id: overrides.guildId } : {});
  const targetClient = client || player.client;
  if (targetClient?.guilds?.cache) {
    targetClient.guilds.cache.set(guild.id, guild);
  }

  const textChannel = overrides.textChannel || {
    send: async () => ({ delete: async () => {}, edit: async () => {} })
  };

  const queue = player.nodes.create(guild.id, {
    metadata: { page: 0, textChannel, ...overrides.metadata },
    ...overrides.queueOptions
  });

  return { guild, queue, textChannel };
}

module.exports = {
  createMockQueue
};
