# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GNOME Shell extension called "Timezones" that displays friends' local times at a glance. The extension adds a clock icon indicator to the GNOME Shell top panel. Clicking it reveals a horizontal list of timezone clocks, each showing the current time and a list of people in that timezone.

## Architecture

**Extension Structure**: This follows the standard GNOME Shell extension pattern for GNOME 45+:
- `extension.js` - Main extension implementation with indicator and UI
- `prefs.js` - Preferences UI for configuring timezones and people
- `metadata.json` - Extension metadata (name, description, UUID, compatible shell versions)
- `stylesheet.css` - Custom CSS styling for extension UI elements
- `schemas/` - GSettings schema for persistent configuration storage

**Key Components**:

1. **TimezoneIndicator** (`extension.js:30-204`): A `GObject.registerClass` wrapped class extending `PanelMenu.Button`
   - Creates panel button with clock icon (`preferences-system-time-symbolic`)
   - Builds horizontal scrollable menu showing timezone widgets
   - Updates times every 60 seconds using `GLib.timeout_add_seconds()`
   - Listens for settings changes to rebuild UI dynamically
   - Properly cleans up timeouts and signals in `destroy()`

2. **Timezone Widget System** (`extension.js:122-166`):
   - Each timezone is displayed in a vertical `St.BoxLayout` containing:
     - Large time display (24pt bold)
     - Timezone name (extracted from timezone ID)
     - List of people names below
   - Widgets are contained in a horizontal scrollable container
   - Times are stored and updated via `_timezoneWidgets` array

3. **Settings Integration** (`extension.js:64-71`):
   - Uses GSettings to store timezone configuration as JSON string
   - Format: `[{timezone: "America/New_York", people: ["Alice", "Bob"]}, ...]`
   - Settings changes trigger automatic UI rebuild

4. **Preferences UI** (`prefs.js`):
   - Uses Adwaita widgets (Adw) for modern GNOME appearance with accordion-style layout
   - `PersonRow` (`prefs.js:63-91`): Individual person entry within a timezone
     - Shows person name with remove button
   - `TimezoneRow` (`prefs.js:94-261`): Expandable row (Adw.ExpanderRow) for each timezone
     - Collapsible/expandable accordion interface
     - Title shows timezone name, subtitle shows person count
     - Timezone dropdown selector when expanded
     - List of people with individual remove buttons
     - "Add Person" button opens dialog for new entries
     - Delete button in header to remove entire timezone
   - Main preferences window shows list of timezone expander rows
   - "Add Timezone" button at bottom to create new timezone entries
   - Auto-saves to GSettings on any change

**Lifecycle Flow**:
1. `enable()` - Loads settings, creates TimezoneIndicator, adds to panel, starts update timer
2. `disable()` - Destroys indicator (which cleans up timeouts/signals), nulls references
3. Settings changes trigger `_buildMenu()` which reconstructs entire menu UI

**UI Framework**: Uses GJS (GNOME JavaScript bindings) with:
- `GObject` - For class registration and inheritance
- `St` (Shell Toolkit) - For UI widgets (`St.Icon`, `St.Label`, `St.BoxLayout`, `St.ScrollView`)
- `GLib` - For timeouts and timezone calculations (`GLib.DateTime`, `GLib.TimeZone`)
- `PanelMenu` and `PopupMenu` - For panel buttons and dropdown menus
- `Gtk` / `Adw` (prefs only) - For preferences window widgets

## Data Flow

1. User configures timezones in preferences (`prefs.js`)
2. Preferences save JSON to GSettings: `org.gnome.shell.extensions.timezone.timezones`
3. Extension watches for settings changes via signal
4. On change, extension calls `_buildMenu()` to rebuild UI
5. Every 60 seconds, `_updateTimes()` refreshes all displayed times
6. Times are calculated using `GLib.DateTime.new_now()` with specific `GLib.TimeZone`

## Development Commands

**Compile Schema** (required after schema changes):
```bash
glib-compile-schemas /home/martin/Projects/timezone@renvoize.com/schemas/
```

**Live Development with Nested GNOME Shell** (RECOMMENDED):

For live reloading without logging out, use a nested GNOME Shell instance:

```bash
# GNOME 49+ (current version)
dbus-run-session -- gnome-shell --devkit

# GNOME 48 and earlier
dbus-run-session -- gnome-shell --nested --wayland
```

Benefits:
- Test extension changes in isolated environment
- No need to log out/in or restart main GNOME Shell
- Enable/disable extension instantly with `gnome-extensions` commands
- Preferences changes apply immediately

**Enhanced nested shell with debugging** (optional):
```bash
#!/bin/sh -e
export G_MESSAGES_DEBUG=all
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
export SHELL_DEBUG=all

if [ "$(gnome-shell --version | awk '{print int($3)}')" -ge 49 ]; then
    command -V mutter-devkit || exit 1
    dbus-run-session -- gnome-shell --devkit
else
    dbus-run-session -- gnome-shell --nested --wayland
fi
```

**Install/Deploy Extension** (for production use):
```bash
# Copy to local extensions directory
cp -r /home/martin/Projects/timezone@renvoize.com/* /home/martin/.local/share/gnome-shell/extensions/timezone@renvoize.com/

# Restart GNOME Shell (X11)
# Press Alt+F2, type 'r', press Enter

# Restart GNOME Shell (Wayland)
# Log out and log back in (only needed for main shell, not nested)
```

**Enable/Disable Extension**:
```bash
# Enable
gnome-extensions enable timezone@renvoize.com

# Disable
gnome-extensions disable timezone@renvoize.com

# Check status
gnome-extensions info timezone@renvoize.com

# Open preferences
gnome-extensions prefs timezone@renvoize.com
```

**Debug Extension**:
```bash
# View logs in real-time
journalctl -f -o cat /usr/bin/gnome-shell

# Or use Looking Glass (Alt+F2, type 'lg')
# This provides an interactive debugger within GNOME Shell
# Access main extension object: Main.extensionManager.lookup('timezone@renvoize.com')
```

**Test Schema**:
```bash
# View current setting
gsettings --schemadir /home/martin/Projects/timezone@renvoize.com/schemas get org.gnome.shell.extensions.timezone timezones

# Manually set for testing
gsettings --schemadir /home/martin/Projects/timezone@renvoize.com/schemas set org.gnome.shell.extensions.timezone timezones '[{"timezone":"America/New_York","people":["Alice","Bob"]},{"timezone":"Europe/London","people":["Charlie"]}]'
```

## Important Notes

- This extension targets GNOME Shell version 45 (shell-version: ["49"])
- The extension uses ES6 modules (import/export) rather than the older imports.gi style
- All UI strings should use the `_()` gettext function for internationalization
- The indicator must properly clean up timeouts and signals in `destroy()` to prevent memory leaks
- Schema must be compiled with `glib-compile-schemas` before installation
- Changes to `extension.js` require reloading GNOME Shell or disabling/re-enabling the extension
- Preferences changes are applied immediately without requiring extension reload
- Timezone IDs must be valid IANA timezone identifiers (e.g., "America/New_York", not "EST")
