# World Clock — Stream Deck Plugin

A Stream Deck plugin that displays multiple world clocks and lets you explore time differences across timezones by shifting time forward or backward.

## Features

- **City Clock tiles** — Add as many as you want, each configurable to any timezone
- **Hour +/-** — Tap to shift 1 hour, hold to shift 3 hours
- **Minute +/-** — Tap to shift 1 minute, hold to shift 15 minutes
- **Reset** — Tap to reset to live time, hold to lock/unlock auto-reset
- **Auto-reset** — After 1 minute of inactivity, clocks snap back to real time
- **Day/Night indicator** — Sun or moon icon per city based on local time
- **Color-coded time** — Orange text for daytime, cyan for nighttime
- **Date display** — Shows the local date for each city (useful when crossing midnight)
- **AM/PM format** — 12-hour time display

## Usage

### Adding Clocks

1. Open the Stream Deck app
2. Find **"World Clock"** in the action categories (right panel)
3. Drag **City Clock** onto any key
4. Click the key to open settings:
   - **Display Name** — Short label (max 6 chars, e.g. "NYC", "TLV", "LON")
   - **Timezone** — Click "Change" to open a searchable list of all timezones
5. Repeat for as many cities as you want

### Adding Controls

Drag these actions onto keys near your clocks:

| Action | Tap | Hold (500ms) |
|--------|-----|--------------|
| **H+** | +1 hour | +3 hours |
| **H-** | -1 hour | -3 hours |
| **M+** | +1 minute | +15 minutes |
| **M-** | -1 minute | -15 minutes |
| **Reset** | Reset to live | Toggle auto-reset lock |

### Exploring Time

1. Press **H+** or **H-** to shift all clocks together
2. Fine-tune with **M+** or **M-**
3. All city tiles update simultaneously showing the offset
4. A red offset indicator (e.g. "+3h", "-1h30m") appears on each tile
5. After 1 minute of no presses, clocks automatically return to live time

### Locking the Offset

If you need to keep the offset longer than 1 minute:
- **Hold Reset** — Toggles lock mode (button turns red, shows "LOCKED")
- When locked, auto-reset is disabled
- **Hold Reset again** — Unlocks (re-enables auto-reset)
- **Tap Reset** — Always resets to live time and unlocks

## Tile Layout

Each city tile displays:

```
 ☀/🌙   CITY
      12:45 PM
       Jun 18
       +3h
```

- Top-left: Sun (6 AM-8 PM) or Moon (8 PM-6 AM) icon
- Top-center: City label
- Center: Time in 12-hour AM/PM format
- Below time: Date
- Bottom: Offset indicator (only when shifted)

## Preview / Demo

Open these files in a browser to test without hardware:

- **`demo.html`** — Full Stream Deck mockup with realistic frame, all buttons interactive, and a Property Inspector preview
- **`preview.html`** — Simpler grid view for quick testing

## Development

### Requirements

- Elgato Stream Deck software 6.4+
- Stream Deck hardware (Classic 15-key, XL 32-key, Mini 6-key, or Plus)

### Project Structure

```
com.nirrotem.worldclock.sdPlugin/
  manifest.json        — Plugin manifest (actions, icons, metadata)
  src/plugin.js        — Main plugin logic (Node.js, SDK 6, canvas rendering)
  pi/city-pi.html      — Property Inspector (timezone picker UI)
  imgs/                — Action icons (PNG + SVG)
  package.json         — Node.js dependencies
  node_modules/        — Installed packages
```

### Updating the Plugin

After making changes:

```bash
rm -rf "$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins/com.nirrotem.worldclock.sdPlugin"
cp -r com.nirrotem.worldclock.sdPlugin "$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins/"
killall "Elgato Stream Deck" 2>/dev/null; open -a "Elgato Stream Deck"
```

### Regenerating Icons

```bash
python3 generate-icons.py
```

## Version History

- **2.0.0** — Migrate to Stream Deck SDK 6 (Node.js) for Marketplace compatibility
- **1.0.2** — Fix encoding on minus buttons, add UTC timezone, remove 3rd column from picker
- **1.0.1** — Add day/night icons, colored time, date display, long-press controls, auto-reset
- **1.0.0** — Initial release with city clocks and H/M offset controls

## Support

If you find this plugin useful, consider supporting my work:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/nirro)

## License

MIT
