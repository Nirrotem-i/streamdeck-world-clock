const { streamDeck, SingletonAction } = require("@elgato/streamdeck");
const { createCanvas } = require("canvas");

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

function renderCity(id) {
  const entry = cityActions[id];
  if (!entry) return;

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

  const canvas = createCanvas(144, 144);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 144, 144);

  if (isDay) {
    ctx.fillStyle = "#ffd93d";
    ctx.beginPath();
    ctx.arc(20, 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd93d";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(20 + Math.cos(angle) * 10, 18 + Math.sin(angle) * 10);
      ctx.lineTo(20 + Math.cos(angle) * 14, 18 + Math.sin(angle) * 14);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#aabbdd";
    ctx.beginPath();
    ctx.arc(20, 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(25, 15, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(entry.label, 72, 28);

  ctx.font = "bold 32px Arial";
  ctx.fillStyle = isDay ? "#ff9f43" : "#00d4ff";
  ctx.fillText(timeStr, 72, 68);

  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#666666";
  ctx.fillText(dateStr, 72, 100);

  if (globalOffsetMinutes !== 0) {
    const offsetHours = Math.floor(Math.abs(globalOffsetMinutes) / 60);
    const offsetMins = Math.abs(globalOffsetMinutes) % 60;
    const sign = globalOffsetMinutes > 0 ? "+" : "-";
    let offsetStr = sign + offsetHours + "h";
    if (offsetMins > 0) offsetStr += offsetMins + "m";

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText(offsetStr, 72, 130);
  }

  const imageData = "data:image/png;base64," + canvas.toBuffer("image/png").toString("base64");
  entry.action.setImage(imageData).catch(() => {});
}

function renderControl(id) {
  const entry = controlActions[id];
  if (!entry) return;

  const canvas = createCanvas(144, 144);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 144, 144);

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

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 128, 128);

    // Draw circular arrow
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(72, 58, 24, -Math.PI * 0.8, Math.PI * 0.6);
    ctx.stroke();

    // Arrowhead
    const tipX = 72 + 24 * Math.cos(Math.PI * 0.6);
    const tipY = 58 + 24 * Math.sin(Math.PI * 0.6);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tipX - 10, tipY - 6);
    ctx.lineTo(tipX + 4, tipY - 2);
    ctx.lineTo(tipX - 4, tipY + 10);
    ctx.closePath();
    ctx.fill();

    // X mark over arrow when locked
    if (autoResetDisabled) {
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(56, 42);
      ctx.lineTo(88, 74);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(88, 42);
      ctx.lineTo(56, 74);
      ctx.stroke();
    }

    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(sublabel, 72, 110);
  } else {
    let label, sublabel, color;

    switch (entry.uuid) {
      case "com.nirrotem.worldclock.hour-plus":
        label = "H+"; sublabel = "1h / 3h"; color = "#4ecca3"; break;
      case "com.nirrotem.worldclock.hour-minus":
        label = "H-"; sublabel = "1h / 3h"; color = "#ff6b6b"; break;
      case "com.nirrotem.worldclock.min-plus":
        label = "M+"; sublabel = "1m / 15m"; color = "#4ecca3"; break;
      case "com.nirrotem.worldclock.min-minus":
        label = "M-"; sublabel = "1m / 15m"; color = "#ff6b6b"; break;
      default: return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 128, 128);

    ctx.fillStyle = color;
    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 72, 60);

    ctx.font = "20px Arial";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(sublabel, 72, 110);
  }

  const imageData = "data:image/png;base64," + canvas.toBuffer("image/png").toString("base64");
  entry.action.setImage(imageData).catch(() => {});
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
