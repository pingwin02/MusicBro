const en = require("../locales/en.json");
const pl = require("../locales/pl.json");

const LOCALES = { en, pl };
const DEFAULT_LOCALE = "pl";

let activeLocale = null;

function getLocale() {
  const envLocale = process.env.LOCALE;
  const rawLocale = activeLocale || envLocale || DEFAULT_LOCALE;
  const normalized = rawLocale.toLowerCase().slice(0, 2);
  return LOCALES[normalized] ? normalized : DEFAULT_LOCALE;
}

function setLocale(locale) {
  if (typeof locale === "string" && LOCALES[locale.toLowerCase().slice(0, 2)]) {
    activeLocale = locale.toLowerCase().slice(0, 2);
  } else {
    activeLocale = null;
  }
}

function resolveNestedKey(obj, path) {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function interpolate(text, params) {
  if (typeof text !== "string") return text;
  return text.replace(/{([a-zA-Z0-9_]+)}/g, (match, paramName) => {
    return Object.prototype.hasOwnProperty.call(params, paramName)
      ? String(params[paramName])
      : match;
  });
}

function t(key, params = {}, explicitLocale = null) {
  if (typeof key !== "string") return "";

  const locale = explicitLocale
    ? explicitLocale.toLowerCase().slice(0, 2)
    : getLocale();
  const primaryDict = LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
  const fallbackDict = LOCALES[DEFAULT_LOCALE];

  let rawValue = resolveNestedKey(primaryDict, key);
  if (rawValue === undefined && primaryDict !== fallbackDict) {
    rawValue = resolveNestedKey(fallbackDict, key);
  }
  if (rawValue === undefined && primaryDict !== LOCALES.en) {
    rawValue = resolveNestedKey(LOCALES.en, key);
  }
  if (rawValue === undefined) {
    return key;
  }

  if (typeof rawValue === "string" && params && typeof params === "object") {
    return interpolate(rawValue, params);
  }

  return rawValue;
}

module.exports = {
  getLocale,
  setLocale,
  t
};
