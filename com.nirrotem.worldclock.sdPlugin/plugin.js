let websocket = null;
let globalOffsetMinutes = 0;
let cityContexts = {};
let controlContexts = {};
let updateInterval = null;
let keyDownTimers = {};
const LONG_PRESS_MS = 500;
const AUTO_RESET_MS = 60000;
let autoResetTimer = null;
let autoResetDisabled = false;

const ACTIONS = {
  CITY: 'com.nirrotem.worldclock.city',
  HOUR_PLUS: 'com.nirrotem.worldclock.hour-plus',
  HOUR_MINUS: 'com.nirrotem.worldclock.hour-minus',
  MIN_PLUS: 'com.nirrotem.worldclock.min-plus',
  MIN_MINUS: 'com.nirrotem.worldclock.min-minus',
  RESET: 'com.nirrotem.worldclock.reset'
};

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
  websocket = new WebSocket('ws://127.0.0.1:' + inPort);

  websocket.onopen = function () {
    websocket.send(JSON.stringify({ event: inRegisterEvent, uuid: inPluginUUID }));
    startUpdateLoop();
  };

  websocket.onmessage = function (evt) {
    const msg = JSON.parse(evt.data);
    const action = msg.action;
    const context = msg.context;

    switch (msg.event) {
      case 'willAppear':
        if (action === ACTIONS.CITY) {
          const settings = msg.payload.settings || {};
          cityContexts[context] = {
            timezone: settings.timezone || 'America/New_York',
            label: settings.label || 'NYC'
          };
          updateCityDisplay(context);
        } else {
          controlContexts[context] = action;
          updateControlDisplay(context, action);
        }
        break;

      case 'willDisappear':
        if (action === ACTIONS.CITY) {
          delete cityContexts[context];
        } else {
          delete controlContexts[context];
        }
        break;

      case 'didReceiveSettings':
        if (action === ACTIONS.CITY) {
          const settings = msg.payload.settings || {};
          cityContexts[context] = {
            timezone: settings.timezone || 'America/New_York',
            label: settings.label || 'NYC'
          };
          updateCityDisplay(context);
        }
        break;

      case 'keyDown':
        handleKeyDown(action, context);
        break;

      case 'keyUp':
        handleKeyUp(action, context);
        break;
    }
  };
}

function handleKeyDown(action, context) {
  if (action === ACTIONS.MIN_PLUS || action === ACTIONS.MIN_MINUS) {
    keyDownTimers[context] = { action, time: Date.now(), fired: false };
    setTimeout(() => {
      const entry = keyDownTimers[context];
      if (entry && !entry.fired) {
        entry.fired = true;
        globalOffsetMinutes += action === ACTIONS.MIN_PLUS ? 15 : -15;
        updateAllDisplays();
      }
    }, LONG_PRESS_MS);
  } else if (action === ACTIONS.HOUR_PLUS || action === ACTIONS.HOUR_MINUS) {
    keyDownTimers[context] = { action, time: Date.now(), fired: false };
    setTimeout(() => {
      const entry = keyDownTimers[context];
      if (entry && !entry.fired) {
        entry.fired = true;
        globalOffsetMinutes += action === ACTIONS.HOUR_PLUS ? 180 : -180;
        updateAllDisplays();
      }
    }, LONG_PRESS_MS);
  } else if (action === ACTIONS.RESET) {
    keyDownTimers[context] = { action, time: Date.now(), fired: false };
    setTimeout(() => {
      const entry = keyDownTimers[context];
      if (entry && !entry.fired) {
        entry.fired = true;
        autoResetDisabled = !autoResetDisabled;
        if (autoResetDisabled) {
          clearTimeout(autoResetTimer);
          autoResetTimer = null;
        } else {
          scheduleAutoReset();
        }
        updateAllDisplays();
      }
    }, LONG_PRESS_MS);
  }
}

function handleKeyUp(action, context) {
  const entry = keyDownTimers[context];
  if (!entry) return;
  if (!entry.fired) {
    if (action === ACTIONS.MIN_PLUS) globalOffsetMinutes += 1;
    else if (action === ACTIONS.MIN_MINUS) globalOffsetMinutes -= 1;
    else if (action === ACTIONS.HOUR_PLUS) globalOffsetMinutes += 60;
    else if (action === ACTIONS.HOUR_MINUS) globalOffsetMinutes -= 60;
    else if (action === ACTIONS.RESET) {
      globalOffsetMinutes = 0;
      autoResetDisabled = false;
      clearTimeout(autoResetTimer);
      autoResetTimer = null;
    }
    updateAllDisplays();
  }
  delete keyDownTimers[context];
}

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

function startUpdateLoop() {
  updateAllDisplays();
  updateInterval = setInterval(updateAllDisplays, 1000);
}

function updateAllDisplays() {
  scheduleAutoReset();
  for (const context of Object.keys(cityContexts)) {
    updateCityDisplay(context);
  }
  for (const [context, action] of Object.entries(controlContexts)) {
    updateControlDisplay(context, action);
  }
}

function updateCityDisplay(context) {
  const city = cityContexts[context];
  if (!city) return;

  const now = new Date();
  now.setMinutes(now.getMinutes() + globalOffsetMinutes);

  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: city.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: city.timezone,
    month: 'short',
    day: 'numeric'
  });

  const hour = parseInt(now.toLocaleTimeString('en-US', {
    timeZone: city.timezone,
    hour: 'numeric',
    hour12: false
  }));
  const isDay = hour >= 6 && hour < 20;

  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 144, 144);

  // Sun/moon icon top-left
  if (isDay) {
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(20, 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd93d';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(20 + Math.cos(angle) * 10, 18 + Math.sin(angle) * 10);
      ctx.lineTo(20 + Math.cos(angle) * 14, 18 + Math.sin(angle) * 14);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#aabbdd';
    ctx.beginPath();
    ctx.arc(20, 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(25, 15, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // City label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(city.label, 72, 28);

  // Time with AM/PM
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = isDay ? '#ff9f43' : '#00d4ff';
  ctx.fillText(timeStr, 72, 68);

  // Date
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText(dateStr, 72, 100);

  // Offset indicator when exploring
  if (globalOffsetMinutes !== 0) {
    const offsetHours = Math.floor(Math.abs(globalOffsetMinutes) / 60);
    const offsetMins = Math.abs(globalOffsetMinutes) % 60;
    const sign = globalOffsetMinutes > 0 ? '+' : '-';
    let offsetStr = sign + offsetHours + 'h';
    if (offsetMins > 0) offsetStr += offsetMins + 'm';

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(offsetStr, 72, 130);
  }

  const imageData = canvas.toDataURL('image/png');

  websocket.send(JSON.stringify({
    event: 'setImage',
    context: context,
    payload: { image: imageData, target: 0 }
  }));
}

function updateControlDisplay(context, action) {
  const canvas = document.createElement('canvas');
  canvas.width = 144;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 144, 144);

  let label, sublabel, color;

  switch (action) {
    case ACTIONS.HOUR_PLUS:
      label = 'H+';
      sublabel = '1h / 3h';
      color = '#4ecca3';
      break;
    case ACTIONS.HOUR_MINUS:
      label = 'H−';
      sublabel = '1h / 3h';
      color = '#ff6b6b';
      break;
    case ACTIONS.MIN_PLUS:
      label = 'M+';
      sublabel = '1m / 15m';
      color = '#4ecca3';
      break;
    case ACTIONS.MIN_MINUS:
      label = 'M−';
      sublabel = '1m / 15m';
      color = '#ff6b6b';
      break;
    case ACTIONS.RESET:
      label = '↺';
      sublabel = autoResetDisabled ? 'LOCKED' : 'RESET';
      color = autoResetDisabled ? '#ff6b6b' : (globalOffsetMinutes === 0 ? '#555' : '#ffd93d');
      break;
    default:
      return;
  }

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 128, 128);

  // Main label
  ctx.fillStyle = color;
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 72, 60);

  // Sub label
  ctx.font = '20px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(sublabel, 72, 110);

  const imageData = canvas.toDataURL('image/png');

  websocket.send(JSON.stringify({
    event: 'setImage',
    context: context,
    payload: { image: imageData, target: 0 }
  }));
}
