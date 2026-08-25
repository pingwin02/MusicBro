const { createCanvas } = require("@napi-rs/canvas");
const { JSDOM } = require("jsdom");
const vm = require("node:vm");

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

let cachedMinter = null;
let minterPromise = null;

function setupDomEnvironment(userAgent) {
  const dom = new JSDOM(
    "<!DOCTYPE html><html lang=\"en\"><head><title></title></head>" +
      "<body></body></html>",
    {
      url: "https://www.youtube.com/",
      referrer: "https://www.youtube.com/",
      resources: {
        userAgent
      }
    }
  );

  dom.window.HTMLCanvasElement.prototype.getContext = function (contextId) {
    if (!this._canvasInstance) {
      this._canvasInstance = createCanvas(
        this.width || 300,
        this.height || 150
      );
    }
    return this._canvasInstance.getContext(contextId);
  };

  dom.window.HTMLCanvasElement.prototype.toDataURL = function (...args) {
    if (!this._canvasInstance) {
      this._canvasInstance = createCanvas(
        this.width || 300,
        this.height || 150
      );
    }
    return this._canvasInstance.toDataURL(...args);
  };

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    origin: dom.window.origin
  });

  if (!Reflect.has(globalThis, "navigator")) {
    Object.defineProperty(globalThis, "navigator", {
      value: dom.window.navigator
    });
  }
}

async function initMinter(innertube) {
  const { BotGuardClient } = await import("bgutils-js/botguard");
  const { WebPoMinter } = await import("bgutils-js/webpo");
  const { buildURL, GOOG_API_KEY, USER_AGENT } =
    await import("bgutils-js/utils");

  setupDomEnvironment(USER_AGENT);

  const challengeResponse = await innertube.getAttestationChallenge(
    "ENGAGEMENT_TYPE_UNBOUND"
  );
  if (!challengeResponse?.bg_challenge) {
    throw new Error("Could not get attestation challenge");
  }

  const interpreterUrl =
    challengeResponse.bg_challenge.interpreter_url
      .private_do_not_access_or_else_trusted_resource_url_wrapped_value;
  const bgScriptResponse = await fetch(`https:${interpreterUrl}`);
  const interpreterJavascript = await bgScriptResponse.text();
  if (!interpreterJavascript) {
    throw new Error("Could not load BotGuard VM");
  }

  vm.runInThisContext(interpreterJavascript);

  const botguard = await BotGuardClient.create({
    program: challengeResponse.bg_challenge.program,
    globalName: challengeResponse.bg_challenge.global_name,
    globalObject: globalThis
  });

  const webPoSignalOutput = [];
  const botguardResponse = await botguard.snapshot({ webPoSignalOutput });

  const integrityTokenResponse = await fetch(buildURL("GenerateIT", true), {
    method: "POST",
    headers: {
      "content-type": "application/json+protobuf",
      "x-goog-api-key": GOOG_API_KEY,
      "x-user-agent": "grpc-web-javascript/0.1",
      "user-agent": USER_AGENT
    },
    body: JSON.stringify([REQUEST_KEY, botguardResponse])
  });

  const response = await integrityTokenResponse.json();
  if (typeof response?.[0] !== "string") {
    throw new Error("Could not get integrity token");
  }

  return WebPoMinter.create({ integrityToken: response[0] }, webPoSignalOutput);
}

async function getPoToken(innertube, videoId) {
  if (!cachedMinter) {
    if (!minterPromise) {
      minterPromise = initMinter(innertube)
        .then((minter) => {
          cachedMinter = minter;
          minterPromise = null;
          return minter;
        })
        .catch((err) => {
          minterPromise = null;
          throw err;
        });
    }
    cachedMinter = await minterPromise;
  }

  return cachedMinter.mintAsWebsafeString(videoId);
}

module.exports = {
  getPoToken
};
