const { faker } = require("@faker-js/faker");
const { createMockGuild } = require("./guild");

function createMockInteraction(overrides = {}) {
  const optionsMap = overrides.options || {};
  let capturedError = null;

  const defaultMember = {
    voice: {
      channel: {
        full: false,
        permissionsFor: () => ({ has: () => true })
      }
    }
  };

  const guild = overrides.guild || createMockGuild();

  const interaction = {
    channel: overrides.channel || { send: async () => {} },
    deferReply: async () => {},
    deferred: overrides.deferred !== undefined ? overrides.deferred : true,
    deleteReply: async () => {},
    editReply: async ({ embeds }) => {
      capturedError = embeds?.[0]?.data?.description;
      return { delete: async () => {} };
    },
    getCapturedError: () => capturedError,
    guild,
    guildId: overrides.guildId || guild.id,
    member: overrides.member !== undefined ? overrides.member : defaultMember,
    options: {
      getBoolean: (name) => Boolean(optionsMap[name]),
      getInteger: (name) =>
        optionsMap[name] !== undefined ? optionsMap[name] : null,
      getString: (name) => optionsMap[name] || null
    },
    replied: overrides.replied !== undefined ? overrides.replied : false
  };

  return interaction;
}

function createMockButtonInteraction(guildId = null, overrides = {}) {
  let deferredUpdate = false;
  let deletedReply = false;
  const resolvedGuildId = guildId || faker.string.numeric(18);
  return {
    deferUpdate: async () => {
      deferredUpdate = true;
    },
    deleteReply: async () => {
      deletedReply = true;
    },
    guild: resolvedGuildId ? { id: resolvedGuildId } : null,
    guildId: resolvedGuildId,
    isDeferred: () => deferredUpdate,
    isDeletedReply: () => deletedReply,
    message: { id: "default-msg-id", ...overrides.message },
    ...overrides
  };
}

module.exports = {
  createMockButtonInteraction,
  createMockInteraction
};
