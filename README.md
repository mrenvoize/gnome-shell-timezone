# Timezones GNOME Shell Extension

A GNOME Shell extension that displays friends' and colleagues' local times at a glance.

## Features

- 🕐 Clock icon indicator in the top panel
- 🌍 Horizontal scrollable list of timezone clocks
- 👥 Display multiple people per timezone
- ⚙️ Easy configuration through preferences UI
- 🔄 Automatically updates every minute
- 🎨 Clean, modern interface using Adwaita design

## Installation

1. **Compile the GSettings schema** (required):
   ```bash
   glib-compile-schemas schemas/
   ```

2. **Install the extension**:

   The extension files should be in:
   ```
   ~/.local/share/gnome-shell/extensions/timezone@renvoize.com/
   ```

3. **Reload GNOME Shell** (REQUIRED after any code changes):
   - **X11**: Press `Alt+F2`, type `r`, and press Enter
   - **Wayland**: Log out and log back in (GNOME Shell caches extension code)

4. **Enable the extension**:
   ```bash
   gnome-extensions enable timezone@renvoize.com
   ```

## Configuration

Open the preferences UI to configure timezones and people:

```bash
gnome-extensions prefs timezone@renvoize.com
```

Or click the "Preferences" option in the extension's dropdown menu.

### Adding Timezones

1. Click "Add Timezone"
2. Select a timezone from the dropdown (30+ common timezones available)
3. Enter people's names in the text area (one per line)
4. Settings are saved automatically

### Example Configuration

```json
[
  {
    "timezone": "America/New_York",
    "people": ["Alice", "Bob"]
  },
  {
    "timezone": "Europe/London",
    "people": ["Charlie"]
  },
  {
    "timezone": "Asia/Tokyo",
    "people": ["David", "Eve"]
  }
]
```

## Usage

1. Click the clock icon in the top panel
2. View all configured timezones horizontally
3. Each timezone shows:
   - Current time (24-hour format)
   - Timezone name
   - List of people in that timezone

Times update automatically every minute.

## Development

See [CLAUDE.md](CLAUDE.md) for detailed architecture and development information.

### Live Development Workflow

For rapid development without logging out, use a nested GNOME Shell:

```bash
# Start nested GNOME Shell (GNOME 49+)
dbus-run-session -- gnome-shell --devkit
```

Inside the nested shell:
1. Enable the extension: `gnome-extensions enable timezone@renvoize.com`
2. Make code changes in your editor
3. Disable and re-enable to reload: `gnome-extensions disable timezone@renvoize.com && gnome-extensions enable timezone@renvoize.com`
4. Test immediately without logging out

This workflow is much faster than logging out/in for each change!

### Quick Commands

```bash
# Compile schema
glib-compile-schemas schemas/

# View extension logs
journalctl -f -o cat /usr/bin/gnome-shell

# Check extension status
gnome-extensions info timezone@renvoize.com

# Disable extension
gnome-extensions disable timezone@renvoize.com

# Test settings
gsettings --schemadir schemas get org.gnome.shell.extensions.timezone timezones
```

## Requirements

- GNOME Shell 45+
- GLib 2.0+

## License

GPL-2.0-or-later

## Credits

Built with [GJS](https://gjs.guide/) and the GNOME Shell Extension APIs.
