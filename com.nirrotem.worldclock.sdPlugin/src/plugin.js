const { streamDeck, SingletonAction } = require("@elgato/streamdeck");

let globalOffsetMinutes = 0;
let autoResetTimer = null;
let autoResetDisabled = false;
const AUTO_RESET_MS = 60000;
const LONG_PRESS_MS = 500;

const cityActions = {};
const controlActions = {};
const keyDownTimers = {};

function scheduleAutoReset() {
  if (autoResetDisabled) return;
  clearTimeout(autoResetTimer);
  if (globalOffsetMinutes !== 0) {
    autoResetTimer = setTimeout(() => {
      globalOffsetMinutes = 0;
      autoResetTimer = null;
      updateAllDisplays();
    }, AUTO_RESET_MS);
  }
}

function updateAllDisplays() {
  scheduleAutoReset();
  for (const id of Object.keys(cityActions)) {
    renderCity(id);
  }
  for (const id of Object.keys(controlActions)) {
    renderControl(id);
  }
}

function svgToDataUri(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function renderCity(id) {
  const entry = cityActions[id];
  if (!entry) return;

  try {
    return renderCityInner(id, entry);
  } catch (e) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="#1a1a2e"/>
  <text x="72" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ff6b6b">ERR</text>
  <text x="72" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#888888">Bad timezone</text>
</svg>`;
    entry.action.setImage(svgToDataUri(svg)).catch(() => {});
  }
}

function renderCityInner(id, entry) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + globalOffsetMinutes);

  const timeStr = now.toLocaleTimeString("en-US", {
    timeZone: entry.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  const dateStr = now.toLocaleDateString("en-US", {
    timeZone: entry.timezone,
    month: "short",
    day: "numeric"
  });

  const hour = parseInt(now.toLocaleTimeString("en-US", {
    timeZone: entry.timezone,
    hour: "numeric",
    hour12: false
  }));
  const isDay = hour >= 6 && hour < 20;

  const timeColor = isDay ? "#ff9f43" : "#00d4ff";

  let sunMoon = "";
  if (isDay) {
    sunMoon = `
      <circle cx="20" cy="18" r="7" fill="#ffd93d"/>
      <line x1="20" y1="4" x2="20" y2="8" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="28" x2="20" y2="32" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="18" x2="10" y2="18" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="30" y1="18" x2="34" y2="18" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="8" x2="13" y2="11" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="27" y1="25" x2="30" y2="28" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="28" x2="13" y2="25" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>
      <line x1="27" y1="11" x2="30" y2="8" stroke="#ffd93d" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    sunMoon = `
      <circle cx="20" cy="18" r="8" fill="#aabbdd"/>
      <circle cx="25" cy="15" r="7" fill="#1a1a2e"/>`;
  }

  let offsetLabel = "";
  if (globalOffsetMinutes !== 0) {
    const offsetHours = Math.floor(Math.abs(globalOffsetMinutes) / 60);
    const offsetMins = Math.abs(globalOffsetMinutes) % 60;
    const sign = globalOffsetMinutes > 0 ? "+" : "-";
    let offsetStr = sign + offsetHours + "h";
    if (offsetMins > 0) offsetStr += offsetMins + "m";
    offsetLabel = `<text x="72" y="134" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ff6b6b">${offsetStr}</text>`;
  }

  const escapedLabel = entry.label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedTime = timeStr.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const escapedDate = dateStr.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="#1a1a2e"/>
  ${sunMoon}
  <text x="72" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${escapedLabel}</text>
  <text x="72" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="${timeColor}">${escapedTime}</text>
  <text x="72" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">${escapedDate}</text>
  ${offsetLabel}
</svg>`;

  entry.action.setImage(svgToDataUri(svg)).catch(() => {});
}

function renderControl(id) {
  const entry = controlActions[id];
  if (!entry) return;

  let svg;

  if (entry.uuid === "com.nirrotem.worldclock.reset") {
    let color, sublabel;
    if (autoResetDisabled) {
      color = "#ff6b6b";
      sublabel = "LOCKED";
    } else if (globalOffsetMinutes !== 0) {
      color = "#ffd93d";
      sublabel = "RESET";
    } else {
      color = "#666666";
      sublabel = "RESET";
    }

    let xMark = "";
    if (autoResetDisabled) {
      xMark = `
        <line x1="56" y1="42" x2="88" y2="74" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round"/>
        <line x1="88" y1="42" x2="56" y2="74" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round"/>`;
    }

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="#1a1a2e"/>
  <rect x="8" y="8" width="128" height="128" rx="8" fill="none" stroke="${color}" stroke-width="4"/>
  <path d="M 48 58 A 24 24 0 1 1 72 82" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
  <polygon points="44,50 52,58 40,62" fill="${color}"/>
  ${xMark}
  <text x="72" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${color}">${sublabel}</text>
</svg>`;
  } else {
    let label, sublabel, color;

    switch (entry.uuid) {
      case "com.nirrotem.worldclock.hour-plus":
        label = "H+"; sublabel = "1h / 3h"; color = "#4ecca3"; break;
      case "com.nirrotem.worldclock.hour-minus":
        label = "H−"; sublabel = "1h / 3h"; color = "#ff6b6b"; break;
      case "com.nirrotem.worldclock.min-plus":
        label = "M+"; sublabel = "1m / 15m"; color = "#4ecca3"; break;
      case "com.nirrotem.worldclock.min-minus":
        label = "M−"; sublabel = "1m / 15m"; color = "#ff6b6b"; break;
      default: return;
    }

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="#1a1a2e"/>
  <rect x="8" y="8" width="128" height="128" rx="8" fill="none" stroke="${color}" stroke-width="4"/>
  <text x="72" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="${color}">${label}</text>
  <text x="72" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#aaaaaa">${sublabel}</text>
</svg>`;
  }

  entry.action.setImage(svgToDataUri(svg)).catch(() => {});
}

// --- City Clock Action ---
class CityClockAction extends SingletonAction {
  constructor() {
    super();
    this.manifestId = "com.nirrotem.worldclock.city";
  }

  onWillAppear(ev) {
    const settings = ev.payload.settings || {};
    cityActions[ev.action.id] = {
      timezone: settings.timezone || "America/New_York",
      label: settings.label || "NYC",
      action: ev.action
    };
    renderCity(ev.action.id);
  }

  onWillDisappear(ev) {
    delete cityActions[ev.action.id];
  }

  onDidReceiveSettings(ev) {
    const settings = ev.payload.settings || {};
    cityActions[ev.action.id] = {
      timezone: settings.timezone || "America/New_York",
      label: settings.label || "NYC",
      action: ev.action
    };
    renderCity(ev.action.id);
  }
}

// --- Control Action Factory ---
function createControlAction(uuid) {
  class ControlAction extends SingletonAction {
    constructor() {
      super();
      this.manifestId = uuid;
    }

    onWillAppear(ev) {
      controlActions[ev.action.id] = { uuid, action: ev.action };
      renderControl(ev.action.id);
    }

    onWillDisappear(ev) {
      delete controlActions[ev.action.id];
    }

    onKeyDown(ev) {
      const id = ev.action.id;
      keyDownTimers[id] = { fired: false };

      setTimeout(() => {
        const entry = keyDownTimers[id];
        if (entry && !entry.fired) {
          entry.fired = true;
          switch (uuid) {
            case "com.nirrotem.worldclock.hour-plus": globalOffsetMinutes += 180; break;
            case "com.nirrotem.worldclock.hour-minus": globalOffsetMinutes -= 180; break;
            case "com.nirrotem.worldclock.min-plus": globalOffsetMinutes += 15; break;
            case "com.nirrotem.worldclock.min-minus": globalOffsetMinutes -= 15; break;
            case "com.nirrotem.worldclock.reset":
              autoResetDisabled = !autoResetDisabled;
              if (autoResetDisabled) { clearTimeout(autoResetTimer); autoResetTimer = null; }
              else { scheduleAutoReset(); }
              break;
          }
          updateAllDisplays();
        }
      }, LONG_PRESS_MS);
    }

    onKeyUp(ev) {
      const id = ev.action.id;
      const entry = keyDownTimers[id];
      if (entry && !entry.fired) {
        switch (uuid) {
          case "com.nirrotem.worldclock.hour-plus": globalOffsetMinutes += 60; break;
          case "com.nirrotem.worldclock.hour-minus": globalOffsetMinutes -= 60; break;
          case "com.nirrotem.worldclock.min-plus": globalOffsetMinutes += 1; break;
          case "com.nirrotem.worldclock.min-minus": globalOffsetMinutes -= 1; break;
          case "com.nirrotem.worldclock.reset":
            globalOffsetMinutes = 0;
            autoResetDisabled = false;
            clearTimeout(autoResetTimer);
            autoResetTimer = null;
            break;
        }
        updateAllDisplays();
      }
      delete keyDownTimers[id];
    }
  }
  return new ControlAction();
}

// Register all actions
streamDeck.actions.registerAction(new CityClockAction());
streamDeck.actions.registerAction(createControlAction("com.nirrotem.worldclock.hour-plus"));
streamDeck.actions.registerAction(createControlAction("com.nirrotem.worldclock.hour-minus"));
streamDeck.actions.registerAction(createControlAction("com.nirrotem.worldclock.min-plus"));
streamDeck.actions.registerAction(createControlAction("com.nirrotem.worldclock.min-minus"));
streamDeck.actions.registerAction(createControlAction("com.nirrotem.worldclock.reset"));

// Update displays every second
setInterval(updateAllDisplays, 1000);

// Connect to Stream Deck
streamDeck.connect();
