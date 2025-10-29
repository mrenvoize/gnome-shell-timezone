/* prefs.js
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

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// Common timezone options
const COMMON_TIMEZONES = [
    {id: 'UTC', name: 'UTC'},
    {id: 'America/New_York', name: 'New York (ET)'},
    {id: 'America/Chicago', name: 'Chicago (CT)'},
    {id: 'America/Denver', name: 'Denver (MT)'},
    {id: 'America/Los_Angeles', name: 'Los Angeles (PT)'},
    {id: 'America/Anchorage', name: 'Anchorage (AKT)'},
    {id: 'Pacific/Honolulu', name: 'Honolulu (HT)'},
    {id: 'Europe/London', name: 'London (GMT/BST)'},
    {id: 'Europe/Paris', name: 'Paris (CET)'},
    {id: 'Europe/Berlin', name: 'Berlin (CET)'},
    {id: 'Europe/Rome', name: 'Rome (CET)'},
    {id: 'Europe/Madrid', name: 'Madrid (CET)'},
    {id: 'Europe/Amsterdam', name: 'Amsterdam (CET)'},
    {id: 'Europe/Brussels', name: 'Brussels (CET)'},
    {id: 'Europe/Vienna', name: 'Vienna (CET)'},
    {id: 'Europe/Stockholm', name: 'Stockholm (CET)'},
    {id: 'Europe/Athens', name: 'Athens (EET)'},
    {id: 'Europe/Helsinki', name: 'Helsinki (EET)'},
    {id: 'Europe/Istanbul', name: 'Istanbul (TRT)'},
    {id: 'Europe/Moscow', name: 'Moscow (MSK)'},
    {id: 'Asia/Dubai', name: 'Dubai (GST)'},
    {id: 'Asia/Kolkata', name: 'Kolkata (IST)'},
    {id: 'Asia/Bangkok', name: 'Bangkok (ICT)'},
    {id: 'Asia/Singapore', name: 'Singapore (SGT)'},
    {id: 'Asia/Hong_Kong', name: 'Hong Kong (HKT)'},
    {id: 'Asia/Shanghai', name: 'Shanghai (CST)'},
    {id: 'Asia/Tokyo', name: 'Tokyo (JST)'},
    {id: 'Asia/Seoul', name: 'Seoul (KST)'},
    {id: 'Australia/Sydney', name: 'Sydney (AEDT)'},
    {id: 'Australia/Melbourne', name: 'Melbourne (AEDT)'},
    {id: 'Australia/Brisbane', name: 'Brisbane (AEST)'},
    {id: 'Australia/Perth', name: 'Perth (AWST)'},
    {id: 'Pacific/Auckland', name: 'Auckland (NZDT)'},
];

// Person row within a timezone
const PersonRow = GObject.registerClass({
    GTypeName: 'PersonRow',
    Signals: {
        'remove': {},
    },
}, class PersonRow extends Adw.ActionRow {
    _init(personName) {
        super._init({
            title: personName,
        });

        this._personName = personName;

        // Remove button
        const removeButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        removeButton.connect('clicked', () => {
            this.emit('remove');
        });
        this.add_suffix(removeButton);
    }

    getPersonName() {
        return this._personName;
    }
});

// Timezone expander row
const TimezoneRow = GObject.registerClass({
    GTypeName: 'TimezoneRow',
    Signals: {
        'changed': {},
        'remove': {},
    },
}, class TimezoneRow extends Adw.ExpanderRow {
    _init(timezone, onChanged) {
        const tzInfo = COMMON_TIMEZONES.find(tz => tz.id === timezone.timezone) || COMMON_TIMEZONES[0];

        super._init({
            title: tzInfo.name,
            subtitle: `${timezone.people.length} ${timezone.people.length === 1 ? 'person' : 'people'}`,
        });

        this._timezone = timezone || {timezone: 'UTC', people: []};
        this._onChanged = onChanged;
        this._personRows = [];

        // Add remove button to suffix
        const removeButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        removeButton.connect('clicked', () => {
            this.emit('remove');
        });
        this.add_suffix(removeButton);

        // Timezone selector row
        const timezoneRow = new Adw.ActionRow({
            title: _('Timezone'),
        });

        this._timezoneDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new(COMMON_TIMEZONES.map(tz => tz.name)),
            valign: Gtk.Align.CENTER,
        });

        const initialIndex = COMMON_TIMEZONES.findIndex(tz => tz.id === this._timezone.timezone);
        if (initialIndex >= 0) {
            this._timezoneDropdown.set_selected(initialIndex);
        }

        this._timezoneDropdown.connect('notify::selected', () => {
            const selected = this._timezoneDropdown.get_selected();
            this._timezone.timezone = COMMON_TIMEZONES[selected].id;
            this.set_title(COMMON_TIMEZONES[selected].name);
            this.emit('changed');
        });

        timezoneRow.add_suffix(this._timezoneDropdown);
        timezoneRow.set_activatable_widget(this._timezoneDropdown);
        this.add_row(timezoneRow);

        // Add existing people
        for (const person of this._timezone.people) {
            this._addPersonRow(person);
        }

        // Add person button
        const addPersonRow = new Adw.ActionRow({
            title: _('Add Person'),
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        addButton.connect('clicked', () => {
            this._showAddPersonDialog();
        });
        addPersonRow.add_suffix(addButton);
        addPersonRow.set_activatable_widget(addButton);
        this.add_row(addPersonRow);
    }

    _addPersonRow(personName) {
        const personRow = new PersonRow(personName);

        personRow.connect('remove', () => {
            const index = this._personRows.indexOf(personRow);
            if (index >= 0) {
                this._personRows.splice(index, 1);
                this.remove(personRow);

                // Update data
                this._timezone.people = this._personRows.map(row => row.getPersonName());
                this._updateSubtitle();
                this.emit('changed');
            }
        });

        // Insert before the "Add Person" row (which is always last)
        this._personRows.push(personRow);
        this.add_row(personRow);

        // Move add button to end
        const addPersonRow = this.get_last_child();
        this.remove(addPersonRow);
        this.add_row(addPersonRow);
    }

    _showAddPersonDialog() {
        const dialog = new Gtk.Dialog({
            title: _('Add Person'),
            modal: true,
            transient_for: this.get_root(),
        });

        dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
        const addBtn = dialog.add_button(_('Add'), Gtk.ResponseType.OK);
        addBtn.add_css_class('suggested-action');

        const content = dialog.get_content_area();
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        const label = new Gtk.Label({
            label: _('Name:'),
            xalign: 0,
        });
        box.append(label);

        const entry = new Gtk.Entry({
            placeholder_text: _('Enter person name'),
            activates_default: true,
        });
        box.append(entry);

        content.append(box);

        dialog.set_default_response(Gtk.ResponseType.OK);

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK) {
                const name = entry.get_text().trim();
                if (name.length > 0) {
                    this._timezone.people.push(name);
                    this._addPersonRow(name);
                    this._updateSubtitle();
                    this.emit('changed');
                }
            }
            dialog.destroy();
        });

        dialog.show();
        entry.grab_focus();
    }

    _updateSubtitle() {
        const count = this._timezone.people.length;
        this.set_subtitle(`${count} ${count === 1 ? 'person' : 'people'}`);
    }

    getData() {
        return this._timezone;
    }
});

export default class TimezonePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings('org.gnome.shell.extensions.timezone');

        const page = new Adw.PreferencesPage({
            title: _('Timezones'),
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(page);

        this._group = new Adw.PreferencesGroup({
            title: _('Configured Timezones'),
            description: _('Click a timezone to expand and manage people'),
        });
        page.add(this._group);

        // Track timezone rows
        this._timezoneRows = [];

        // Load existing timezones
        this._loadTimezones();

        // Add timezone button at the bottom
        const addGroup = new Adw.PreferencesGroup();
        page.add(addGroup);

        const addRow = new Adw.ActionRow({
            title: _('Add Timezone'),
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        addButton.connect('clicked', () => {
            this._addTimezoneRow();
        });
        addRow.add_suffix(addButton);
        addRow.set_activatable_widget(addButton);
        addGroup.add(addRow);
    }

    _loadTimezones() {
        const timezonesJson = this._settings.get_string('timezones');
        let timezones = [];

        try {
            timezones = JSON.parse(timezonesJson);
        } catch (e) {
            console.error('Failed to parse timezones:', e);
        }

        if (timezones.length === 0) {
            // Add one default row if no timezones exist
            this._addTimezoneRow();
        } else {
            for (const tz of timezones) {
                this._addTimezoneRow(tz);
            }
        }
    }

    _addTimezoneRow(timezone) {
        const row = new TimezoneRow(timezone || {timezone: 'UTC', people: []});

        row.connect('changed', () => {
            this._saveTimezones();
        });

        row.connect('remove', () => {
            const index = this._timezoneRows.indexOf(row);
            if (index >= 0) {
                this._timezoneRows.splice(index, 1);
                this._group.remove(row);
                this._saveTimezones();
            }
        });

        this._timezoneRows.push(row);
        this._group.add(row);
    }

    _saveTimezones() {
        const timezones = this._timezoneRows.map(row => row.getData());
        const timezonesJson = JSON.stringify(timezones);
        this._settings.set_string('timezones', timezonesJson);
    }
}
