const assert = require("node:assert/strict");
const test = require("node:test");
const en = require("../locales/en.json");
const pl = require("../locales/pl.json");
const { getLocale, setLocale, t } = require("../utils/i18n");

test("i18n - default and custom locale setting", () => {
  setLocale(null);
  delete process.env.LOCALE;
  assert.equal(getLocale(), "pl");

  process.env.LOCALE = "en";
  assert.equal(getLocale(), "en");

  delete process.env.LOCALE;
  setLocale("en");
  assert.equal(getLocale(), "en");

  setLocale("pl");
  assert.equal(getLocale(), "pl");

  setLocale("invalid_locale");
  assert.equal(getLocale(), "pl");
  setLocale(null);
});

test("i18n - translations in Polish and English", () => {
  setLocale("pl");
  assert.equal(t("commands.clear.description"), "Czyści kolejkę utworów");
  assert.equal(t("buttons.next"), "Następna strona");

  setLocale("en");
  assert.equal(t("commands.clear.description"), "Clears the tracks queue");
  assert.equal(t("buttons.next"), "Next page");
  setLocale(null);
});

test("i18n - parameter interpolation", () => {
  setLocale("pl");
  const interpolated = t("commands.export.exported_title", {
    count: 3,
    trackWord: "utwory"
  });
  assert.equal(interpolated, "Wyeksportowano **3** utwory:");

  setLocale("en");
  const interpolatedEn = t("commands.export.exported_title", {
    count: 3,
    trackWord: "tracks"
  });
  assert.equal(interpolatedEn, "Exported **3** tracks:");
  setLocale(null);
});

test("i18n - fallback when key or locale is missing", () => {
  assert.equal(t("nonexistent.key"), "nonexistent.key");
  assert.equal(t(""), "");
  assert.equal(t(null), "");
});

function getObjectPaths(obj, prefix = "") {
  let paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths = paths.concat(getObjectPaths(value, fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

test("i18n - translation key parity between pl and en", () => {
  const plKeys = getObjectPaths(pl).sort();
  const enKeys = getObjectPaths(en).sort();

  assert.deepEqual(
    plKeys,
    enKeys,
    "All translation keys should exist in both pl.json and en.json"
  );
});
