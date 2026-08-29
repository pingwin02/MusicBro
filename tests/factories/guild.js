const { faker } = require("@faker-js/faker");

function createMockGuild(overrides = {}) {
  return {
    id: overrides.id || faker.string.numeric(18),
    name: overrides.name || faker.company.name(),
    ...overrides
  };
}

module.exports = {
  createMockGuild
};
