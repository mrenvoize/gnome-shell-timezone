/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Generate SHA-256 hash of a string
 */
function sha256(str) {
    const checksum = GLib.Checksum.new(GLib.ChecksumType.SHA256);
    checksum.update(new TextEncoder().encode(str));
    return checksum.get_string();
}

/**
 * Generate Gravatar URL from email address
 */
function getGravatarUrl(email, size = 48) {
    if (!email || email.trim() === '') {
        return null;
    }
    const normalized = email.trim().toLowerCase();
    const hash = sha256(normalized);
    return `https://gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

const TimezoneIndicator = GObject.registerClass({
    Signals: {
        'open-preferences': {},
    },
}, class TimezoneIndicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.5, _('Timezones'));

        this._settings = settings;
        this._httpSession = new Soup.Session();

        // Add clock icon to panel
        this._icon = new St.Icon({
            icon_name: 'preferences-system-time-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        // Build the timezone display menu
        this._buildMenu();

        // Update times every minute
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            this._updateTimes();
            return GLib.SOURCE_CONTINUE;
        });

        // Listen for settings changes
        this._settingsChangedId = this._settings.connect('changed::timezones', () => {
            this._buildMenu();
        });
    }

    _buildMenu() {
        // Clear existing menu items
        this.menu.removeAll();

        // Get timezone configuration
        const timezonesJson = this._settings.get_string('timezones');
        let timezones = [];

        try {
            timezones = JSON.parse(timezonesJson);
        } catch (e) {
            console.error('Failed to parse timezones:', e);
        }

        if (timezones.length === 0) {
            // Show message when no timezones configured
            const item = new PopupMenu.PopupMenuItem(_('No timezones configured'));
            item.reactive = false;
            this.menu.addMenuItem(item);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        } else {
            // Create horizontal container for timezone displays
            this._timezoneContainer = new St.BoxLayout({
                style_class: 'timezone-container',
                vertical: false,
                x_expand: true,
            });

            // Store timezone widgets for updates
            this._timezoneWidgets = [];

            for (const tz of timezones) {
                const tzWidget = this._createTimezoneWidget(tz);
                this._timezoneContainer.add_child(tzWidget);
                this._timezoneWidgets.push({widget: tzWidget, timezone: tz});
            }

            const scrollView = new St.ScrollView({
                style_class: 'timezone-scroll',
                hscrollbar_policy: St.PolicyType.AUTOMATIC,
                vscrollbar_policy: St.PolicyType.NEVER,
            });
            scrollView.add_child(this._timezoneContainer);

            const menuItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
            });
            menuItem.add_child(scrollView);
            this.menu.addMenuItem(menuItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }

        // Add preferences option
        const prefsItem = new PopupMenu.PopupMenuItem(_('Preferences'));
        prefsItem.connect('activate', () => {
            this.emit('open-preferences');
        });
        this.menu.addMenuItem(prefsItem);
    }

    _createTimezoneWidget(tz) {
        const container = new St.BoxLayout({
            style_class: 'timezone-widget',
            vertical: true,
            style: 'padding: 10px; margin: 5px;',
        });

        // Time label
        const timeLabel = new St.Label({
            style_class: 'timezone-time',
            style: 'font-size: 24pt; font-weight: bold;',
        });

        // Update time
        const dateTime = GLib.DateTime.new_now(GLib.TimeZone.new(tz.timezone));
        timeLabel.text = dateTime ? dateTime.format('%H:%M') : '--:--';

        container.add_child(timeLabel);

        // Timezone label
        const tzLabel = new St.Label({
            style_class: 'timezone-label',
            text: this._getTimezoneName(tz.timezone),
            style: 'font-size: 9pt; color: #888;',
        });
        container.add_child(tzLabel);

        // People with avatars
        if (tz.people && tz.people.length > 0) {
            for (const person of tz.people) {
                const personContainer = new St.BoxLayout({
                    style_class: 'timezone-person-container',
                    vertical: false,
                    style: 'margin-top: 4px; spacing: 6px;',
                });

                // Handle both old string format and new object format
                const personName = typeof person === 'string' ? person : person.name;
                const personEmail = typeof person === 'string' ? '' : (person.email || '');

                // Add Gravatar image if email is available
                if (personEmail) {
                    const avatarUrl = getGravatarUrl(personEmail, 32);
                    if (avatarUrl) {
                        const avatar = new St.Icon({
                            style_class: 'timezone-avatar',
                            icon_size: 32,
                            style: 'border-radius: 16px;',
                        });

                        // Load Gravatar image
                        this._loadGravatar(avatar, avatarUrl);
                        personContainer.add_child(avatar);
                    }
                }

                const personLabel = new St.Label({
                    style_class: 'timezone-person',
                    text: personName,
                    style: 'font-size: 10pt;',
                    y_align: Clutter.ActorAlign.CENTER,
                });
                personContainer.add_child(personLabel);

                container.add_child(personContainer);
            }
        }

        // Store the time label for updates
        container._timeLabel = timeLabel;
        container._timezone = tz.timezone;

        return container;
    }

    _loadGravatar(iconWidget, url) {
        try {
            const message = Soup.Message.new('GET', url);

            this._httpSession.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, result) => {
                    try {
                        if (message.get_status() === Soup.Status.OK) {
                            const bytes = session.send_and_read_finish(result);

                            // Save to temporary file
                            const tmpFile = Gio.File.new_for_path(
                                `${GLib.get_tmp_dir()}/gravatar_${GLib.uuid_string_random()}.jpg`
                            );

                            const outputStream = tmpFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
                            outputStream.write_bytes(bytes, null);
                            outputStream.close(null);

                            // Load the image from file
                            const gicon = Gio.FileIcon.new(tmpFile);
                            iconWidget.set_gicon(gicon);

                            // Clean up temp file after a delay
                            GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 60, () => {
                                try {
                                    tmpFile.delete(null);
                                } catch (e) {
                                    // Ignore cleanup errors
                                }
                                return GLib.SOURCE_REMOVE;
                            });
                        }
                    } catch (e) {
                        console.error('Failed to load Gravatar:', e);
                    }
                }
            );
        } catch (e) {
            console.error('Failed to fetch Gravatar:', e);
        }
    }

    _getTimezoneName(timezone) {
        // Extract readable name from timezone ID (e.g., "America/New_York" -> "New York")
        const parts = timezone.split('/');
        if (parts.length > 1) {
            return parts[parts.length - 1].replace(/_/g, ' ');
        }
        return timezone;
    }

    _updateTimes() {
        if (!this._timezoneWidgets) return;

        for (const tzWidget of this._timezoneWidgets) {
            const dateTime = GLib.DateTime.new_now(GLib.TimeZone.new(tzWidget.timezone.timezone));
            const timeLabel = tzWidget.widget._timeLabel;
            if (timeLabel && dateTime) {
                timeLabel.text = dateTime.format('%H:%M');
            }
        }
    }

    destroy() {
        // Clean up timeout
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }

        // Disconnect settings signal
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        super.destroy();
    }
});

export default class TimezoneExtension extends Extension {
    enable() {
        this._settings = this.getSettings('org.gnome.shell.extensions.timezone');
        this._indicator = new TimezoneIndicator(this._settings);

        // Connect preferences signal
        this._indicator.connect('open-preferences', () => {
            this.openPreferences();
        });

        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
