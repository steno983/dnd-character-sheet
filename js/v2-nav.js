/**
 * v2-nav.js - Bottom navigation tab switching for v2 layout
 *
 * NOTE: The loadTheme() override is in an inline <script> in the HTML <head>
 * to intercept the first call from app.js during initialization.
 */

(function () {
    'use strict';

    var TABS = ['scheda', 'note', 'inventario'];

    function switchTab(tabName) {
        if (TABS.indexOf(tabName) === -1) return;

        TABS.forEach(function (name) {
            var content = document.getElementById('tab-' + name);
            var btn = document.getElementById('nav-' + name);
            var icon = btn ? btn.querySelector('.material-symbols-outlined') : null;

            if (name === tabName) {
                // Show content
                if (content) content.classList.remove('hidden');
                // Style active button
                if (btn) {
                    btn.style.background = 'var(--md-primary-container)';
                    btn.style.color = 'var(--md-on-primary-container)';
                }
                if (icon) icon.style.fontVariationSettings = "'FILL' 1";
            } else {
                // Hide content
                if (content) content.classList.add('hidden');
                // Style inactive button
                if (btn) {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--md-on-surface-variant)';
                }
                if (icon) icon.style.fontVariationSettings = "'FILL' 0";
            }
        });

        // Trigger renders when switching to specific tabs
        if (tabName === 'note' && typeof window.renderNotes === 'function') {
            window.renderNotes();
        }
        if (tabName === 'inventario' && typeof window.renderInventory === 'function') {
            window.renderInventory();
        }
    }

    // Override showSheet and showNotes from app.js
    window.showSheet = function () { switchTab('scheda'); };
    window.showNotes = function () { switchTab('note'); };

    // Expose switchTab globally for onclick handlers in HTML
    window.switchTab = switchTab;

    // Override spell type icons with colored Material Symbols
    var SPELL_ICON_MAP = {
        'damage':  '<span class="material-symbols-outlined spell-icon-damage" style="font-size:14px; color:#ef4444; font-variation-settings:\'FILL\' 1; vertical-align:-2px;">swords</span>',
        'healing': '<span class="material-symbols-outlined spell-icon-healing" style="font-size:14px; color:#34d399; font-variation-settings:\'FILL\' 1; vertical-align:-2px;">cardiology</span>',
        'buff':    '<span class="material-symbols-outlined spell-icon-buff" style="font-size:14px; color:#60a5fa; font-variation-settings:\'FILL\' 1; vertical-align:-2px;">shield_with_heart</span>',
        'utility': '<span class="material-symbols-outlined spell-icon-utility" style="font-size:14px; color:#a78bfa; font-variation-settings:\'FILL\' 1; vertical-align:-2px;">auto_awesome</span>'
    };

    window.getSpellTypeIcon = function (type) {
        return SPELL_ICON_MAP[type] || '';
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        switchTab('scheda');
    });
})();
