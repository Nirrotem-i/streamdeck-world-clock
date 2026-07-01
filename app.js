(() => {
  let globalOffsetSeconds = 0;
  let activeClocks = [];
  let selectedTimezone = null;
  let timeLocked = false;
  let frozenTime = null;

  // --- Settings ---
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem('timeshift-settings') || '{}');
    } catch (e) { return {}; }
  }

  function getTimeFormat() {
    const s = loadSettings();
    return s.timeFormat === '24h' ? '24h' : '12h';
  }

  function applyTheme() {
    const s = loadSettings();
    document.body.classList.toggle('light-mode', s.theme === 'light');
  }

  applyTheme();

  const clocksArea = document.getElementById('clocks-area');
  const citySearch = document.getElementById('city-search');
  const cityList = document.getElementById('city-list');
  const activeList = document.getElementById('active-list');
  const offsetDisplay = document.getElementById('offset-display');
  const keyboardHint = document.getElementById('keyboard-hint');

  // --- Offset Controls ---
  const cancelBtn = document.getElementById('cancel-offset');
  cancelBtn.addEventListener('click', () => {
    globalOffsetSeconds = 0;
    timeLocked = false;
    frozenTime = null;
    stopBtn.classList.remove('stopped');
    stopBtn.textContent = '⏱ STOP TIME';
    deselectClock();
    updateAll();
  });

  // --- Clock Selection & Time Input ---
  function selectClock(timezone) {
    selectedTimezone = timezone;
    document.querySelectorAll('.clock-card').forEach(card => {
      const isSelected = card.dataset.timezone === timezone;
      card.classList.toggle('selected', isSelected);
      const input = card.querySelector('.led-time-input');
      if (isSelected && input) {
        input.classList.add('active');
        input.value = '';
        input.focus();
      } else if (input) {
        input.classList.remove('active');
      }
    });
    const clock = activeClocks.find(c => c.timezone === timezone);
    const examples = getTimeFormat() === '24h' ? '14:30, 9:00' : '9:00am, 3:30pm';
    keyboardHint.innerHTML = `<strong style="color:var(--accent)">${clock.label}</strong> — type a time (e.g. ${examples}) then press <kbd>Enter</kbd>. <kbd>Esc</kbd> to deselect`;
  }

  function deselectClock() {
    selectedTimezone = null;
    document.querySelectorAll('.clock-card').forEach(card => {
      card.classList.remove('selected');
      const input = card.querySelector('.led-time-input');
      if (input) input.classList.remove('active');
    });
    keyboardHint.innerHTML = 'Click a clock to select it, then type a time to shift all clocks';
  }

  function applyTypedTime(timezone, timeString) {
    const parsed = parseTimeInput(timeString);
    if (parsed === null) return false;

    const { hours, minutes } = parsed;

    // Get current actual time in that timezone (without offset)
    const now = new Date();
    const currentInTz = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const [curH, curM] = currentInTz.split(':').map(Number);
    const currentTotalMin = curH * 60 + curM;
    const targetTotalMin = hours * 60 + minutes;

    let diff = targetTotalMin - currentTotalMin;
    // Choose the shortest path (wrap around midnight)
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;

    globalOffsetSeconds = diff * 60;
    if (timeLocked) {
      frozenTime = new Date();
      frozenTime.setSeconds(frozenTime.getSeconds() + globalOffsetSeconds);
    }
    updateAll();
    return true;
  }

  function parseTimeInput(str) {
    str = str.trim().toLowerCase();

    // Match formats: "9:00", "9:30pm", "14:30", "9pm", "21:00"
    const match = str.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
    if (!match) return null;

    let hours = parseInt(match[1]);
    let minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3];

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return { hours, minutes };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      deselectClock();
    }
  });

  // --- City Search ---
  function renderCityList(filter = '') {
    cityList.innerHTML = '';
    const query = filter.toLowerCase();
    const filtered = TIMEZONES.filter(tz =>
      tz.label.toLowerCase().includes(query) ||
      tz.timezone.toLowerCase().includes(query) ||
      tz.region.toLowerCase().includes(query)
    );

    filtered.forEach(tz => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="tz-city">${tz.label}</span><br><span class="tz-region">${tz.region} · ${tz.timezone}</span>`;
      li.addEventListener('click', () => addClock(tz));
      cityList.appendChild(li);
    });
  }

  citySearch.addEventListener('input', (e) => renderCityList(e.target.value));
  citySearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstItem = cityList.querySelector('li');
      if (firstItem) firstItem.click();
      citySearch.value = '';
      renderCityList();
    }
  });

  // --- Clock Management ---
  function addClock(tz) {
    if (activeClocks.find(c => c.timezone === tz.timezone)) return;
    activeClocks.push({ ...tz });
    saveTolocalStorage();
    renderClocks();
    renderActiveList();
    updateAll();
  }

  function removeClock(timezone) {
    activeClocks = activeClocks.filter(c => c.timezone !== timezone);
    saveTolocalStorage();
    renderClocks();
    renderActiveList();
    updateAll();
  }

  function renderActiveList() {
    activeList.innerHTML = '';
    activeClocks.forEach(clock => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${clock.label}</span><button data-tz="${clock.timezone}">✕</button>`;
      li.querySelector('button').addEventListener('click', () => removeClock(clock.timezone));
      activeList.appendChild(li);
    });
  }

  // --- Render All Clock Cards ---
  function renderClocks() {
    clocksArea.innerHTML = '';
    if (activeClocks.length === 0) {
      clocksArea.innerHTML = '<p class="empty-state">Add cities from the panel on the right →</p>';
      return;
    }

    activeClocks.forEach(clock => {
      const card = document.createElement('div');
      card.className = 'clock-card';
      if (clock.timezone === selectedTimezone) card.classList.add('selected');
      card.dataset.timezone = clock.timezone;
      card.innerHTML = `
        <span class="reference-badge">▸ ref</span>
        <button class="remove-btn" title="Remove">✕</button>
        <button class="shift-btn shift-minus" title="−1 min (shift: −1 hr)">−</button>
        <button class="shift-btn shift-plus" title="+1 min (shift: +1 hr)">+</button>
        <div class="city-name">${clock.label}</div>
        <div class="timezone-label">${clock.timezone}</div>
        <div class="led-clock">
          <div class="led-time"></div>
          <div class="led-date"></div>
          <input type="text" class="led-time-input ${clock.timezone === selectedTimezone ? 'active' : ''}"
            placeholder="${getTimeFormat() === '24h' ? '14:30' : '9:00pm'}" maxlength="10" autocomplete="off" spellcheck="false">
        </div>
        <div class="analog-clock">
          <svg viewBox="0 0 120 120"></svg>
        </div>
        <span class="offset-badge ${getCurrentOffsetSeconds() !== 0 ? 'visible' : ''}">${getCurrentOffsetSeconds() !== 0 ? '⏱ ' + formatOffsetSeconds(getCurrentOffsetSeconds()) : ''}</span>
      `;
      card.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedTimezone === clock.timezone) {
          deselectClock();
        } else {
          removeClock(clock.timezone);
        }
      });
      card.querySelector('.shift-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        shiftTime(e.shiftKey ? -60 : -1);
      });
      card.querySelector('.shift-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        shiftTime(e.shiftKey ? 60 : 1);
      });
      card.addEventListener('wheel', (e) => {
        e.preventDefault();
        const scrollAmount = e.shiftKey ? -e.deltaX || e.deltaY : -e.deltaY;
        if (scrollAmount === 0) return;
        const delta = scrollAmount > 0 ? 1 : -1;
        shiftTime(e.shiftKey ? delta * 60 : delta);
      }, { passive: false });
      card.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn') || e.target.closest('.shift-btn') || e.target.classList.contains('led-time-input')) return;
        if (selectedTimezone === clock.timezone) {
          deselectClock();
        } else {
          selectClock(clock.timezone);
        }
      });
      const input = card.querySelector('.led-time-input');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (input.value.trim() === '') {
            deselectClock();
          } else {
            const success = applyTypedTime(clock.timezone, input.value);
            if (success) {
              input.value = '';
              deselectClock();
            } else {
              input.classList.add('error');
              setTimeout(() => input.classList.remove('error'), 600);
            }
          }
        }
        if (e.key === 'Escape') {
          input.value = '';
          deselectClock();
        }
      });
      clocksArea.appendChild(card);
    });
  }

  // --- Stop Time ---
  const stopBtn = document.getElementById('stop-time');
  stopBtn.addEventListener('click', () => {
    timeLocked = !timeLocked;
    if (timeLocked) {
      frozenTime = new Date();
      frozenTime.setSeconds(frozenTime.getSeconds() + globalOffsetSeconds);
    } else {
      globalOffsetSeconds = Math.round((frozenTime.getTime() - Date.now()) / 1000);
      frozenTime = null;
    }
    stopBtn.classList.toggle('stopped', timeLocked);
    stopBtn.textContent = timeLocked ? '⏸ STOPPED' : '⏱ STOP TIME';
    updateAll();
  });

  function shiftTime(minutes) {
    globalOffsetSeconds += minutes * 60;
    if (timeLocked && frozenTime) {
      frozenTime.setMinutes(frozenTime.getMinutes() + minutes);
    }
    updateAll();
  }

  // --- Update All Displays ---
  function getDisplayTime() {
    if (timeLocked && frozenTime) {
      return new Date(frozenTime.getTime());
    }
    const now = new Date();
    now.setSeconds(now.getSeconds() + globalOffsetSeconds);
    return now;
  }


  function updateAll() {
    updateOffsetDisplay();
    document.querySelectorAll('.clock-card').forEach(card => {
      const tz = card.dataset.timezone;
      updateDigitalClock(card, tz);
      updateAnalogClock(card, tz);
    });
  }

  function formatOffsetSeconds(totalSeconds) {
    const sign = totalSeconds > 0 ? '+' : '-';
    const abs = Math.abs(totalSeconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    let str = sign;
    if (h > 0) str += h + 'h';
    str += (h > 0 ? String(m).padStart(2, '0') : m) + 'm';
    str += String(s).padStart(2, '0') + 's';
    return str;
  }

  function getCurrentOffsetSeconds() {
    if (timeLocked && frozenTime) {
      return Math.round((frozenTime.getTime() - Date.now()) / 1000);
    }
    return globalOffsetSeconds;
  }

  function updateOffsetDisplay() {
    const offsetSec = getCurrentOffsetSeconds();
    const hasOffset = offsetSec !== 0 || timeLocked;

    if (!hasOffset) {
      offsetDisplay.textContent = '';
      cancelBtn.classList.add('hidden');
    } else {
      offsetDisplay.textContent = formatOffsetSeconds(offsetSec);
      cancelBtn.classList.remove('hidden');
    }

    document.querySelectorAll('.clock-card').forEach(card => {
      const badge = card.querySelector('.offset-badge');
      if (hasOffset) {
        badge.textContent = '⏱ ' + formatOffsetSeconds(offsetSec);
        badge.classList.add('visible');
        card.classList.add('offset');
      } else {
        badge.classList.remove('visible');
        card.classList.remove('offset');
      }
    });
  }

  // --- Digital Clock (LED style) ---
  function updateDigitalClock(card, timezone) {
    const now = getDisplayTime();
    const use12h = getTimeFormat() === '12h';

    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: use12h
    });

    const dateStr = now.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const ledTime = card.querySelector('.led-time');
    if (use12h) {
      const parts = timeStr.match(/(\d{2}:\d{2}:\d{2})\s*(AM|PM)/i);
      if (parts) {
        ledTime.innerHTML = `${parts[1]}<span class="ampm">${parts[2]}</span>`;
      } else {
        ledTime.textContent = timeStr;
      }
    } else {
      ledTime.textContent = timeStr;
    }
    card.querySelector('.led-date').textContent = dateStr;
  }

  // --- Analog Clock (white day / black night) ---
  function updateAnalogClock(card, timezone) {
    const now = getDisplayTime();

    const hourStr = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });
    const hour24 = parseInt(hourStr);
    const isDay = hour24 >= 6 && hour24 < 20;

    const timeComponents = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const [h, m, s] = timeComponents.split(':').map(Number);

    const secondAngle = (s / 60) * 360;
    const minuteAngle = ((m + s / 60) / 60) * 360;
    const hourAngle = (((h % 12) + m / 60) / 12) * 360;

    const faceFill = isDay ? '#ffffff' : '#1a1a2e';
    const faceStroke = isDay ? '#cccccc' : '#333355';
    const handColor = isDay ? '#222222' : '#ffffff';
    const secondColor = isDay ? '#cc0000' : '#ff4444';
    const tickColor = isDay ? '#444444' : '#aaaaaa';
    const numberColor = isDay ? '#333333' : '#cccccc';

    const cx = 60, cy = 60, r = 54;

    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const inner = i % 3 === 0 ? r - 10 : r - 6;
      const outer = r - 2;
      const x1 = cx + inner * Math.sin(angle);
      const y1 = cy - inner * Math.cos(angle);
      const x2 = cx + outer * Math.sin(angle);
      const y2 = cy - outer * Math.cos(angle);
      const width = i % 3 === 0 ? 2.5 : 1.2;
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${tickColor}" stroke-width="${width}" stroke-linecap="round"/>`;
    }

    let numbers = '';
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const nr = r - 18;
      const nx = cx + nr * Math.sin(angle);
      const ny = cy - nr * Math.cos(angle) + 4;
      numbers += `<text x="${nx}" y="${ny}" text-anchor="middle" font-size="9" font-weight="600" fill="${numberColor}" font-family="sans-serif">${i}</text>`;
    }

    const hourRad = (hourAngle - 90) * Math.PI / 180;
    const minRad = (minuteAngle - 90) * Math.PI / 180;
    const secRad = (secondAngle - 90) * Math.PI / 180;

    const hourLen = 28;
    const minLen = 38;
    const secLen = 42;

    const svg = card.querySelector('.analog-clock svg');
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${faceFill}" stroke="${faceStroke}" stroke-width="3"/>
      ${ticks}
      ${numbers}
      <line x1="${cx}" y1="${cy}" x2="${cx + hourLen * Math.cos(hourRad)}" y2="${cy + hourLen * Math.sin(hourRad)}"
        stroke="${handColor}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${cx + minLen * Math.cos(minRad)}" y2="${cy + minLen * Math.sin(minRad)}"
        stroke="${handColor}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${cx + secLen * Math.cos(secRad)}" y2="${cy + secLen * Math.sin(secRad)}"
        stroke="${secondColor}" stroke-width="1" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="3" fill="${handColor}"/>
    `;
  }

  // --- Local Storage ---
  function saveTolocalStorage() {
    localStorage.setItem('timeshift-clocks', JSON.stringify(activeClocks));
  }

  function loadFromLocalStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem('timeshift-clocks'));
      if (Array.isArray(saved) && saved.length > 0) {
        activeClocks = saved;
      }
    } catch (e) {}
  }

  // --- Init ---
  renderCityList();
  loadFromLocalStorage();
  renderClocks();
  renderActiveList();
  updateAll();

  setInterval(updateAll, 1000);

  // --- Settings Modal ---
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsClose = document.getElementById('settings-close');

  function openSettings() {
    const s = loadSettings();
    settingsOverlay.querySelectorAll('.toggle-option').forEach(btn => {
      const setting = btn.dataset.setting;
      const value = btn.dataset.value;
      const current = setting === 'timeFormat' ? (s.timeFormat || '12h') : (s.theme || 'dark');
      btn.classList.toggle('active', value === current);
    });
    settingsOverlay.classList.remove('hidden');
  }

  function closeSettings() {
    settingsOverlay.classList.add('hidden');
  }

  settingsToggle.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  settingsOverlay.querySelectorAll('.toggle-group').forEach(group => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-option');
      if (!btn) return;

      group.querySelectorAll('.toggle-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const s = loadSettings();
      s[btn.dataset.setting] = btn.dataset.value;
      localStorage.setItem('timeshift-settings', JSON.stringify(s));

      if (btn.dataset.setting === 'theme') applyTheme();
      updateAll();
    });
  });
})();
