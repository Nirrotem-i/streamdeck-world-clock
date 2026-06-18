let websocket = null;
let globalOffsetMinutes = 0;
let cityContexts = {};
let controlContexts = {};
let updateInterval = null;
let keyDownTimers = {};
const LONG_PRESS_MS = 500;

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
  } else {
    switch (action) {
      case ACTIONS.HOUR_PLUS:
        globalOffsetMinutes += 60;
        break;
      case ACTIONS.HOUR_MINUS:
        globalOffsetMinutes -= 60;
        break;
      case ACTIONS.RESET:
        globalOffsetMinutes = 0;
        break;
    }
    updateAllDisplays();
  }
}

function handleKeyUp(action, context) {
  const entry = keyDownTimers[context];
  if (entry && !entry.fired) {
    globalOffsetMinutes += action === ACTIONS.MIN_PLUS ? 1 : -1;
    updateAllDisplays();
  }
  delete keyDownTimers[context];
}

function startUpdateLoop() {
  updateAllDisplays();
  updateInterval = setInterval(updateAllDisplays, 1000);
}

function updateAllDisplays() {
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
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(isDay ? '☀' : '🌙', 8, 6);

  // City label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(city.label, 72, 28);

  // Time with AM/PM
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#00d4ff';
  ctx.fillText(timeStr, 72, 68);

  // Date
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#888888';
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
      sublabel = '1 hr';
      color = '#4ecca3';
      break;
    case ACTIONS.HOUR_MINUS:
      label = 'H−';
      sublabel = '1 hr';
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
      sublabel = 'RESET';
      color = globalOffsetMinutes === 0 ? '#555' : '#ffd93d';
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
