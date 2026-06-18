#!/bin/bash
# Install the World Clock plugin for Stream Deck
# This creates a symlink in the Stream Deck plugins directory

PLUGIN_DIR="$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins"
PLUGIN_NAME="com.nirrotem.worldclock.sdPlugin"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "Error: Stream Deck plugins directory not found."
  echo "Make sure the Elgato Stream Deck software is installed."
  exit 1
fi

# Remove old installation if exists
if [ -L "$PLUGIN_DIR/$PLUGIN_NAME" ] || [ -d "$PLUGIN_DIR/$PLUGIN_NAME" ]; then
  rm -rf "$PLUGIN_DIR/$PLUGIN_NAME"
  echo "Removed old installation."
fi

# Create symlink
ln -s "$SCRIPT_DIR/$PLUGIN_NAME" "$PLUGIN_DIR/$PLUGIN_NAME"

echo "Plugin installed successfully!"
echo "Please restart the Stream Deck application."
echo ""
echo "To restart Stream Deck:"
echo "  killall 'Elgato Stream Deck' 2>/dev/null; open -a 'Elgato Stream Deck'"
