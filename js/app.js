// D&D Character Sheet - Main Application Logic

// Global state
let character = null;
let characterConfig = null;
let spellDatabase = null;

// ==================== INITIALIZATION ====================

async function loadCharacter() {
    // Get character ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const charId = urlParams.get('char') || 'tholgrin';

    try {
        // Load character configuration
        const configResponse = await fetch(`data/characters/${charId}.json`);
        if (!configResponse.ok) throw new Error(`Character ${charId} not found`);
        characterConfig = await configResponse.json();

        // Load theme CSS
        loadTheme(characterConfig.theme);

        // Load spell database
        const spellsResponse = await fetch(`data/${characterConfig.spellsFile}`);
        if (spellsResponse.ok) {
            spellDatabase = await spellsResponse.json();
        }

        // Load character data from localStorage or use defaults
        const savedData = localStorage.getItem(characterConfig.storageKey);
        if (savedData) {
            character = JSON.parse(savedData);
            // Merge with defaults to ensure all fields exist
            character = mergeWithDefaults(character, characterConfig.defaults);
        } else {
            character = JSON.parse(JSON.stringify(characterConfig.defaults));
        }

        // Ensure required fields
        ensureRequiredFields();

        // Initialize UI
        initializeUI();

    } catch (error) {
        console.error('Error loading character:', error);
        document.body.innerHTML = `<div style="color: white; padding: 20px; text-align: center;">
            <h1>Errore</h1>
            <p>Impossibile caricare il personaggio: ${error.message}</p>
            <p>Prova con: <a href="?char=tholgrin" style="color: #daa520;">Tholgrin</a> o <a href="?char=sylan" style="color: #9b6dff;">Sylan</a></p>
        </div>`;
    }
}

function loadTheme(themeName) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `css/themes/${themeName}.css`;
    document.head.appendChild(link);
}

function mergeWithDefaults(saved, defaults) {
    const merged = { ...defaults };
    for (const key in saved) {
        if (saved[key] !== null && typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
            merged[key] = mergeWithDefaults(saved[key], defaults[key] || {});
        } else {
            merged[key] = saved[key];
        }
    }
    return merged;
}

function ensureRequiredFields() {
    if (!character.stats) character.stats = characterConfig.defaults.stats;
    if (!character.hp) character.hp = characterConfig.defaults.hp;
    if (character.armorClass === undefined) character.armorClass = characterConfig.defaults.armorClass;
    if (character.speed === undefined) character.speed = characterConfig.defaults.speed;
    if (!character.spellSlots) character.spellSlots = {};
    if (!character.attacks) character.attacks = [];

    // Ensure spell slots from config
    characterConfig.spellSlots.forEach(slot => {
        if (!character.spellSlots[slot.level]) {
            character.spellSlots[slot.level] = { current: slot.max, max: slot.max };
        }
    });

    // Class-specific fields
    if (characterConfig.classFeatures.channelDivinity?.enabled) {
        if (!character.channelDivinity) {
            character.channelDivinity = {
                current: characterConfig.classFeatures.channelDivinity.uses,
                max: characterConfig.classFeatures.channelDivinity.uses
            };
        }
    }

    if (characterConfig.classFeatures.wardingFlare?.enabled) {
        if (!character.wardingFlare) {
            character.wardingFlare = { current: 0, max: 0 };
        }
    }

    if (characterConfig.classFeatures.portent?.enabled) {
        if (!character.portent) {
            character.portent = { dice: [0, 0], used: [false, false] };
        }
    }

    if (characterConfig.classFeatures.mageArmor?.enabled) {
        if (character.mageArmorActive === undefined) {
            character.mageArmorActive = false;
        }
    }

    if (characterConfig.classFeatures.detectMagic?.enabled) {
        if (character.detectMagicUsed === undefined) {
            character.detectMagicUsed = false;
        }
    }

    // Notes
    if (!character.notes) {
        character.notes = [];
    }

    // Generic Inventory
    if (!character.items) {
        character.items = [];
    }

    // Magic Items inventory charges
    if (characterConfig.inventory) {
        if (!character.inventoryCharges) character.inventoryCharges = {};
        characterConfig.inventory.forEach(item => {
            if (item.charges) {
                if (item.charges.type === 'pips' && character.inventoryCharges[item.id] === undefined) {
                    character.inventoryCharges[item.id] = item.charges.max;
                }
                if (item.charges.type === 'individual' && !character.inventoryCharges[item.id]) {
                    character.inventoryCharges[item.id] = item.charges.items.map(() => false);
                }
            }
        });
    }
}

function initializeUI() {
    // Set page title
    document.title = `Scheda ${characterConfig.class} - ${characterConfig.name}`;

    // Set header
    document.getElementById('charName').value = character.name;
    document.getElementById('classLevelText').textContent =
        `${characterConfig.class} · Livello ${characterConfig.level} · ${characterConfig.subclass}`;

    // Set proficiency bonus display
    const profBonusEl = document.getElementById('proficiency-bonus');
    if (profBonusEl) {
        profBonusEl.textContent = `+${characterConfig.proficiencyBonus}`;
    }

    // Set hit dice type
    const hitDiceTitle = document.getElementById('hit-dice-title');
    if (hitDiceTitle) {
        hitDiceTitle.textContent = `Dadi Vita (${characterConfig.hitDiceType})`;
    }

    // Set layout class based on character config
    const mainGrid = document.getElementById('mainGrid');
    mainGrid.className = `main-grid ${characterConfig.layout || 'cleric-layout'}`;

    // Set stats layout
    const statsColumn = document.getElementById('statsColumn');
    statsColumn.className = `stats-column ${characterConfig.statsLayout || 'vertical'}`;

    // Configure stat blocks for compact layout if needed
    if (characterConfig.statsLayout === 'horizontal') {
        document.querySelectorAll('.stat-block').forEach(block => {
            block.classList.add('compact');
        });
        document.querySelectorAll('.stat-name').forEach(name => {
            name.classList.add('compact');
        });
        document.querySelectorAll('.stat-modifier').forEach(mod => {
            mod.classList.add('compact');
        });
        document.querySelectorAll('.stat-score').forEach(score => {
            score.classList.add('compact');
        });
    }

    // Load stat values
    loadStatValues();

    // Load combat values
    loadCombatValues();

    // Setup event listeners
    setupEventListeners();

    // Setup spell slots from config (must be before generateAllPips)
    setupSpellSlots();

    // Generate resource pips
    generateAllPips();

    // Setup class-specific sections
    setupClassFeatures();

    // Render inventory
    renderInventory();

    // Render inventory
    renderInventory();

    // Update all modifiers
    updateModifiers();

    // Render spellbook
    renderSpellbook();

    // Hide spell levels that don't exist for this character
    hideUnusedSpellLevels();
}

// ==================== UTILITY FUNCTIONS ====================

function calculateModifier(score) {
    return Math.floor((score - 10) / 2);
}

function formatModifier(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function saveCharacter() {
    localStorage.setItem(characterConfig.storageKey, JSON.stringify(character));
    showSaveIndicator();
}

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 1500);
}

// ==================== STAT MANAGEMENT ====================

function loadStatValues() {
    document.getElementById('str-score').value = character.stats.strength;
    document.getElementById('dex-score').value = character.stats.dexterity;
    document.getElementById('con-score').value = character.stats.constitution;
    document.getElementById('int-score').value = character.stats.intelligence;
    document.getElementById('wis-score').value = character.stats.wisdom;
    document.getElementById('cha-score').value = character.stats.charisma;
}

function loadCombatValues() {
    document.getElementById('hp-current').value = character.hp.current;
    document.getElementById('hp-max').value = character.hp.max;
    document.getElementById('hp-temp').value = character.hp.temp;

    const acDisplay = document.getElementById('armor-class-display');
    const acInput = document.getElementById('armor-class');
    if (acDisplay) {
        updateACDisplay();
    } else if (acInput) {
        acInput.value = character.armorClass;
    }

    document.getElementById('speed').value = character.speed;
}

function updateModifiers() {
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

    stats.forEach((stat, i) => {
        const score = parseInt(character.stats[statNames[i]]) || 10;
        const mod = calculateModifier(score);
        document.getElementById(`${stat}-mod`).textContent = formatModifier(mod);
    });

    // Update initiative
    const dexMod = calculateModifier(character.stats.dexterity || 10);
    const alertBonus = characterConfig.classFeatures.alert?.bonus || 0;
    document.getElementById('initiative').textContent = formatModifier(dexMod + alertBonus);

    // Update spellcasting
    const spellAbility = characterConfig.spellcastingAbility;
    const spellMod = calculateModifier(character.stats[spellAbility] || 10);
    const proficiency = characterConfig.proficiencyBonus;

    document.getElementById('spell-dc').textContent = 8 + proficiency + spellMod;
    document.getElementById('spell-attack').textContent = formatModifier(proficiency + spellMod);

    // Update AC if wizard with mage armor
    if (characterConfig.classFeatures.mageArmor?.enabled) {
        updateACDisplay();
    }

    // Update Warding Flare uses if enabled
    if (characterConfig.classFeatures.wardingFlare?.enabled) {
        const wisMod = calculateModifier(character.stats.wisdom || 10);
        const wfMax = Math.max(1, wisMod);
        if (character.wardingFlare.max !== wfMax) {
            character.wardingFlare.max = wfMax;
            character.wardingFlare.current = Math.min(character.wardingFlare.current, wfMax);
            saveCharacter();
        }
        generateWardingFlarePips();
    }

    // Update skill bonuses if skills are enabled
    if (typeof updateSkillBonuses === 'function') {
        updateSkillBonuses();
    }
}

function updateACDisplay() {
    const acDisplay = document.getElementById('armor-class-display');
    if (!acDisplay) return;

    let ac;

    if (characterConfig.classFeatures.mageArmor?.enabled) {
        // Mage: calculate AC based on Mage Armor toggle
        const dexMod = calculateModifier(character.stats.dexterity || 10);
        if (character.mageArmorActive) {
            ac = 13 + dexMod;
        } else {
            ac = 10 + dexMod;
        }
    } else {
        // Other classes: use fixed armor class value
        ac = character.armorClass || 10;
    }

    acDisplay.textContent = ac;
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Character name
    document.getElementById('charName').addEventListener('input', (e) => {
        character.name = e.target.value;
        saveCharacter();
    });

    // Stats
    const statInputs = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    statInputs.forEach((stat, i) => {
        document.getElementById(`${stat}-score`).addEventListener('input', (e) => {
            character.stats[statNames[i]] = parseInt(e.target.value) || 10;
            updateModifiers();
            saveCharacter();
        });
    });

    // HP
    document.getElementById('hp-current').addEventListener('input', (e) => {
        character.hp.current = parseInt(e.target.value) || 0;
        saveCharacter();
    });
    document.getElementById('hp-max').addEventListener('input', (e) => {
        character.hp.max = parseInt(e.target.value) || 0;
        saveCharacter();
    });
    document.getElementById('hp-temp').addEventListener('input', (e) => {
        character.hp.temp = parseInt(e.target.value) || 0;
        saveCharacter();
    });

    // Armor Class (if editable)
    const acInput = document.getElementById('armor-class');
    if (acInput) {
        acInput.addEventListener('input', (e) => {
            character.armorClass = parseInt(e.target.value) || 10;
            saveCharacter();
        });
    }

    // Speed
    document.getElementById('speed').addEventListener('input', (e) => {
        character.speed = parseInt(e.target.value) || 30;
        saveCharacter();
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSpellModal();
            const portentModal = document.getElementById('portentModal');
            if (portentModal) portentModal.classList.remove('active');
        }
    });
}

// ==================== PIP GENERATION ====================

function generateAllPips() {
    // Hit dice
    const hitDiceContainer = document.getElementById('hit-dice-pips');
    if (hitDiceContainer) {
        generatePips(hitDiceContainer, character.hitDice?.current || 0, character.hitDice?.max || characterConfig.level, 'hitDice');
    }

    // Channel Divinity
    if (characterConfig.classFeatures.channelDivinity?.enabled) {
        const cdContainer = document.getElementById('channel-divinity-pips');
        if (cdContainer) {
            generatePips(cdContainer, character.channelDivinity.current, character.channelDivinity.max, 'channelDivinity');
        }
    }

    // Detect Magic (racial)
    if (characterConfig.classFeatures.detectMagic?.enabled) {
        generateDetectMagicPip();
    }

    // Spell slots
    generateSpellPips();

    // Warding Flare
    if (characterConfig.classFeatures.wardingFlare?.enabled) {
        generateWardingFlarePips();
    }
}

function generatePips(container, current, max, type) {
    container.innerHTML = '';
    for (let i = 0; i < max; i++) {
        const pip = document.createElement('div');
        pip.className = `pip ${i < current ? 'filled' : ''}`;
        pip.onclick = () => togglePip(type, i);
        container.appendChild(pip);
    }
}

function generateSpellPips() {
    document.querySelectorAll('.spell-slots-pips').forEach(container => {
        const level = container.dataset.level;
        const max = parseInt(container.dataset.max);
        const current = character.spellSlots[level]?.current || 0;

        container.innerHTML = '';
        for (let i = 0; i < max; i++) {
            const pip = document.createElement('div');
            pip.className = `spell-pip ${i < current ? 'filled' : ''}`;
            pip.onclick = () => toggleSpellSlot(level, i);
            container.appendChild(pip);
        }
    });
}

function generateWardingFlarePips() {
    const container = document.getElementById('warding-flare-pips');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < character.wardingFlare.max; i++) {
        const pip = document.createElement('div');
        pip.className = `pip ${i < character.wardingFlare.current ? 'filled' : ''}`;
        pip.style.borderColor = '#e09422';
        pip.onclick = () => toggleWardingFlare(i);
        container.appendChild(pip);
    }
}

function generateDetectMagicPip() {
    const container = document.getElementById('detect-magic-pips');
    if (!container) return;

    container.innerHTML = '';
    const pip = document.createElement('div');
    pip.className = `pip ${!character.detectMagicUsed ? 'filled' : ''}`;
    pip.onclick = () => {
        character.detectMagicUsed = !character.detectMagicUsed;
        generateDetectMagicPip();
        saveCharacter();
    };
    container.appendChild(pip);
}

// ==================== PIP TOGGLING ====================

function togglePip(type, index) {
    if (type === 'hitDice') {
        if (!character.hitDice) character.hitDice = { current: 0, max: characterConfig.level };
        character.hitDice.current = index < character.hitDice.current ? index : index + 1;
        generatePips(document.getElementById('hit-dice-pips'), character.hitDice.current, character.hitDice.max, 'hitDice');
    } else if (type === 'channelDivinity') {
        character.channelDivinity.current = index < character.channelDivinity.current ? index : index + 1;
        generatePips(document.getElementById('channel-divinity-pips'), character.channelDivinity.current, character.channelDivinity.max, 'channelDivinity');
    }
    saveCharacter();
}

function toggleSpellSlot(level, index) {
    const current = character.spellSlots[level].current;
    character.spellSlots[level].current = index < current ? index : index + 1;
    generateSpellPips();
    saveCharacter();
}

function toggleWardingFlare(index) {
    const current = character.wardingFlare.current;
    character.wardingFlare.current = index < current ? index : index + 1;
    generateWardingFlarePips();
    saveCharacter();
}

// ==================== REST FUNCTIONS ====================

function shortRest(btn) {
    btn.classList.add('resting');
    setTimeout(() => btn.classList.remove('resting'), 600);

    // Recover Channel Divinity if cleric
    if (characterConfig.classFeatures.channelDivinity?.enabled &&
        characterConfig.classFeatures.channelDivinity?.resetOn === 'shortRest') {
        character.channelDivinity.current = character.channelDivinity.max;
        generatePips(document.getElementById('channel-divinity-pips'),
            character.channelDivinity.current, character.channelDivinity.max, 'channelDivinity');
    }

    saveCharacter();
    console.log('Short rest completed');
}

function longRest(btn) {
    btn.classList.add('resting');
    setTimeout(() => btn.classList.remove('resting'), 600);

    // Recover all HP
    character.hp.current = character.hp.max;
    document.getElementById('hp-current').value = character.hp.current;

    // Recover all hit dice
    if (!character.hitDice) character.hitDice = { current: 0, max: characterConfig.level };
    character.hitDice.current = character.hitDice.max;
    generatePips(document.getElementById('hit-dice-pips'), character.hitDice.current, character.hitDice.max, 'hitDice');

    // Recover all spell slots
    for (let level in character.spellSlots) {
        character.spellSlots[level].current = character.spellSlots[level].max;
    }
    generateSpellPips();

    // Recover Channel Divinity if cleric
    if (characterConfig.classFeatures.channelDivinity?.enabled) {
        character.channelDivinity.current = character.channelDivinity.max;
        generatePips(document.getElementById('channel-divinity-pips'),
            character.channelDivinity.current, character.channelDivinity.max, 'channelDivinity');
    }

    // Recover Warding Flare if cleric
    if (characterConfig.classFeatures.wardingFlare?.enabled) {
        character.wardingFlare.current = character.wardingFlare.max;
        generateWardingFlarePips();
    }

    // Recover Detect Magic daily use if wizard
    if (characterConfig.classFeatures.detectMagic?.enabled) {
        character.detectMagicUsed = false;
        generateDetectMagicPip();
    }

    // Recover inventory charges
    if (characterConfig.inventory) {
        characterConfig.inventory.forEach(item => {
            if (item.charges) {
                if (item.charges.type === 'pips') {
                    if (item.charges.resetAmount === '1d3') {
                        // Ring of the Ram: recover 1d3 charges
                        const current = character.inventoryCharges[item.id] || 0;
                        const roll = Math.floor(Math.random() * 3) + 1;
                        character.inventoryCharges[item.id] = Math.min(item.charges.max, current + roll);
                    } else {
                        character.inventoryCharges[item.id] = item.charges.max;
                    }
                } else if (item.charges.type === 'individual') {
                    character.inventoryCharges[item.id] = item.charges.items.map(() => false);
                }
            }
        });
        renderInventory();
    }

    // Show Portent modal for wizard
    if (characterConfig.classFeatures.portent?.enabled) {
        setTimeout(() => showPortentModal(), 700);
    }

    saveCharacter();
    console.log('Long rest completed - All resources restored');
}

// ==================== INVENTORY MANAGEMENT ====================

function renderInventory() {
    const container = document.getElementById('magic-inventory-list');
    if (!container || !characterConfig.inventory) return;

    container.innerHTML = characterConfig.inventory.map(item => {
        let chargesHtml = '';

        if (item.charges) {
            if (item.charges.type === 'pips') {
                const current = character.inventoryCharges[item.id] || 0;
                const max = item.charges.max;
                let pipsHtml = '';
                for (let i = 0; i < max; i++) {
                    pipsHtml += `<div class="inventory-pip ${i < current ? 'filled' : ''}" onclick="toggleInventoryPip('${item.id}', ${i}, ${max})"></div>`;
                }
                chargesHtml = `
                    <div class="inventory-charges">
                        <div class="inventory-charges-label">Cariche</div>
                        <div class="inventory-charges-pips">${pipsHtml}</div>
                    </div>`;
            } else if (item.charges.type === 'individual') {
                const states = character.inventoryCharges[item.id] || [];
                const spellsHtml = item.charges.items.map((spell, i) => `
                    <div class="inventory-spell-charge ${states[i] ? 'used' : ''}" onclick="toggleInventorySpell('${item.id}', ${i})">
                        <div class="inventory-spell-dot"></div>
                        <div class="inventory-spell-info">
                            <span class="inventory-spell-name">${spell.name}</span>
                            ${spell.description ? `<span class="inventory-spell-desc">${spell.description}</span>` : ''}
                        </div>
                    </div>
                `).join('');
                chargesHtml = `
                    <div class="inventory-charges">
                        <div class="inventory-charges-label">Incantesimi</div>
                        <div class="inventory-spell-charges">${spellsHtml}</div>
                    </div>`;
            }
        }

        return `
            <div class="inventory-item" id="inv-${item.id}">
                <div class="inventory-item-header" onclick="toggleInventoryBody('${item.id}')">
                    <span class="inventory-item-name">${item.name}</span>
                    <div class="inventory-item-badges">
                        <span class="inventory-badge rarity">${item.rarity}</span>
                        ${item.attunement ? '<span class="inventory-badge attunement">Sintonia</span>' : ''}
                    </div>
                </div>
                <div class="inventory-item-body" id="inv-body-${item.id}">
                    <div class="inventory-item-desc">${item.description}</div>
                    ${chargesHtml}
                </div>
            </div>
        `;
    }).join('');
}

function toggleInventoryBody(itemId) {
    const body = document.getElementById(`inv-body-${itemId}`);
    if (body) body.classList.toggle('open');
}

function toggleInventoryPip(itemId, index, max) {
    event.stopPropagation();
    const current = character.inventoryCharges[itemId] || 0;
    character.inventoryCharges[itemId] = index < current ? index : index + 1;
    renderInventory();
    // Reopen the body since we re-rendered
    const body = document.getElementById(`inv-body-${itemId}`);
    if (body) body.classList.add('open');
    saveCharacter();
}

function toggleInventorySpell(itemId, index) {
    event.stopPropagation();
    if (!character.inventoryCharges[itemId]) return;
    character.inventoryCharges[itemId][index] = !character.inventoryCharges[itemId][index];
    renderInventory();
    // Reopen the body since we re-rendered
    const body = document.getElementById(`inv-body-${itemId}`);
    if (body) body.classList.add('open');
    saveCharacter();
}

// ==================== CLASS FEATURES SETUP ====================

function setupClassFeatures() {
    // Show/hide class-specific sections
    const sections = {
        'channel-divinity-section': characterConfig.classFeatures.channelDivinity?.enabled,
        'warding-flare-section': characterConfig.classFeatures.wardingFlare?.enabled,
        'portent-section': characterConfig.classFeatures.portent?.enabled,
        'mage-armor-section': characterConfig.classFeatures.mageArmor?.enabled,
        'abilities-section': characterConfig.classFeatures.abilities?.length > 0,
        'skills-section': characterConfig.classFeatures.skills?.enabled
    };

    for (const [sectionId, enabled] of Object.entries(sections)) {
        const section = document.getElementById(sectionId);
        if (section) {
            if (enabled) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        }
    }

    // Show/hide Channel Divinity resource box
    const cdBox = document.getElementById('channel-divinity-box');
    if (cdBox) {
        if (characterConfig.classFeatures.channelDivinity?.enabled) {
            cdBox.classList.remove('hidden');
        } else {
            cdBox.classList.add('hidden');
        }
    }

    // Show/hide Detect Magic box
    const dmBox = document.getElementById('detect-magic-box');
    if (dmBox) {
        if (characterConfig.classFeatures.detectMagic?.enabled) {
            dmBox.classList.remove('hidden');
        } else {
            dmBox.classList.add('hidden');
        }
    }

    // Hide standalone rest buttons if abilities section is shown
    const restButtonsStandalone = document.getElementById('rest-buttons-standalone');
    if (restButtonsStandalone) {
        if (characterConfig.classFeatures.abilities?.length > 0) {
            restButtonsStandalone.style.display = 'none';
        } else {
            restButtonsStandalone.style.display = 'flex';
        }
    }

    // Setup Mage Armor toggle
    if (characterConfig.classFeatures.mageArmor?.enabled) {
        const toggle = document.getElementById('mageArmorToggle');
        const label = document.getElementById('mageArmorLabel');
        const desc = document.getElementById('mage-armor-desc');
        if (toggle && character.mageArmorActive) {
            toggle.classList.add('active');
            label.textContent = 'Attiva';
        }
        if (desc && characterConfig.classFeatures.mageArmor.description) {
            desc.innerHTML = characterConfig.classFeatures.mageArmor.description;
        }
    }

    // Setup Portent
    if (characterConfig.classFeatures.portent?.enabled) {
        const desc = document.getElementById('portent-desc');
        if (desc && characterConfig.classFeatures.portent.description) {
            desc.innerHTML = characterConfig.classFeatures.portent.description;
        }
        setupPortentListeners();
        updatePortentDisplay();
    }

    // Setup Warding Flare description
    if (characterConfig.classFeatures.wardingFlare?.enabled) {
        const desc = document.getElementById('warding-flare-desc');
        if (desc && characterConfig.classFeatures.wardingFlare.description) {
            desc.innerHTML = characterConfig.classFeatures.wardingFlare.description;
        }
    }

    // Setup Channel Divinity abilities
    if (characterConfig.classFeatures.channelDivinity?.enabled) {
        const abilitiesContainer = document.getElementById('channel-divinity-abilities');
        if (abilitiesContainer && characterConfig.classFeatures.channelDivinity.abilities) {
            abilitiesContainer.innerHTML = characterConfig.classFeatures.channelDivinity.abilities.map(ability => `
                <div class="cd-ability">
                    <div class="cd-ability-name">${ability.name}</div>
                    <div class="cd-ability-desc">${ability.description}</div>
                </div>
            `).join('');
        }
    }

    // Setup skills if enabled
    if (characterConfig.classFeatures.skills?.enabled && typeof renderSkills === 'function') {
        renderSkills();
    }

    // Render abilities
    if (characterConfig.classFeatures.abilities?.length > 0) {
        renderAbilities();
    }
}

function setupSpellSlots() {
    const container = document.getElementById('spell-slots-container');
    if (!container) return;

    container.innerHTML = '';
    characterConfig.spellSlots.forEach(slot => {
        const row = document.createElement('div');
        row.className = 'spell-level-row';
        row.innerHTML = `
            <span class="spell-level-label">${slot.level}° Livello</span>
            <div class="spell-slots-pips" data-level="${slot.level}" data-max="${slot.max}"></div>
        `;
        container.appendChild(row);
    });
}

function renderAbilities() {
    const container = document.getElementById('abilities-list');
    if (!container || !characterConfig.classFeatures.abilities) return;

    container.innerHTML = characterConfig.classFeatures.abilities.map(ability => `
        <div class="ability-item">
            <div class="ability-name">${ability.name}</div>
            <div class="ability-desc">${ability.description}</div>
        </div>
    `).join('');
}

// ==================== MAGE ARMOR ====================

function toggleMageArmor() {
    character.mageArmorActive = !character.mageArmorActive;
    const toggle = document.getElementById('mageArmorToggle');
    const label = document.getElementById('mageArmorLabel');

    if (character.mageArmorActive) {
        toggle.classList.add('active');
        label.textContent = 'Attiva';
    } else {
        toggle.classList.remove('active');
        label.textContent = 'Inattiva';
    }

    updateACDisplay();
    saveCharacter();
}

// ==================== PORTENT ====================

function setupPortentListeners() {
    document.getElementById('portent1')?.addEventListener('input', (e) => {
        character.portent.dice[0] = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
        saveCharacter();
    });
    document.getElementById('portent2')?.addEventListener('input', (e) => {
        character.portent.dice[1] = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
        saveCharacter();
    });
}

function updatePortentDisplay() {
    for (let i = 0; i < 2; i++) {
        const input = document.getElementById(`portent${i + 1}`);
        const btn = document.getElementById(`portent${i + 1}Btn`);

        if (input) input.value = character.portent.dice[i] || 0;

        if (btn) {
            if (character.portent.used[i]) {
                input?.classList.add('used');
                btn.classList.add('used');
                btn.textContent = 'Usato';
            } else {
                input?.classList.remove('used');
                btn.classList.remove('used');
                btn.textContent = 'Usa';
            }
        }
    }
}

function usePortent(index) {
    character.portent.used[index] = !character.portent.used[index];
    updatePortentDisplay();
    saveCharacter();
}

function showPortentModal() {
    const modal = document.getElementById('portentModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('portentModal1').value = '';
        document.getElementById('portentModal2').value = '';
        document.getElementById('portentModal1')?.focus();
    }
}

function confirmPortent() {
    const val1 = parseInt(document.getElementById('portentModal1').value) || 0;
    const val2 = parseInt(document.getElementById('portentModal2').value) || 0;

    character.portent.dice = [
        Math.min(20, Math.max(1, val1)),
        Math.min(20, Math.max(1, val2))
    ];
    character.portent.used = [false, false];

    document.getElementById('portentModal').classList.remove('active');
    updatePortentDisplay();
    saveCharacter();
}

// ==================== SPELLBOOK ====================

function renderSpellbook() {
    if (!characterConfig.spells || !spellDatabase) return;

    // Cantrips
    renderSpellCategory('cantrips-grid', characterConfig.spells.cantrips, 'cantrip');

    // Spell levels
    for (let level = 1; level <= 9; level++) {
        const key = `level${level}`;
        const gridId = `level${level}-grid`;
        if (characterConfig.spells[key]) {
            renderSpellCategory(gridId, characterConfig.spells[key], '');
        }
    }
}

function hideUnusedSpellLevels() {
    // Hide spell levels that the character doesn't have
    for (let level = 1; level <= 9; level++) {
        const key = `level${level}`;
        const categoryEl = document.getElementById(`level${level}-category`);
        if (categoryEl) {
            if (!characterConfig.spells[key] || characterConfig.spells[key].length === 0) {
                categoryEl.style.display = 'none';
            }
        }
    }
}

function getSpellTypeIcon(type) {
    const icons = {
        'damage': '⚔️',
        'healing': '💚',
        'buff': '🛡️',
        'utility': '✨'
    };
    return icons[type] || '';
}

function renderSpellCategory(containerId, spellIds, extraClass) {
    const container = document.getElementById(containerId);
    if (!container || !spellIds) return;

    container.innerHTML = spellIds.map(spellId => {
        const spell = spellDatabase[spellId];
        if (!spell) return '';

        let classes = ['spell-chip'];
        if (extraClass) classes.push(extraClass);
        if (spell.domain) classes.push('domain');
        if (spell.racial) classes.push('racial');

        const suffix = spell.domain ? ' ✦' : (spell.racial ? ' ✦' : '');
        const typeIcon = spell.type ? `<span class="spell-type-icon">${getSpellTypeIcon(spell.type)}</span>` : '';

        return `<span class="${classes.join(' ')}" onclick="openSpell('${spellId}')">${typeIcon}${spell.name}${suffix}</span>`;
    }).join('');
}

// ==================== INVENTORY MANAGEMENT ====================

function renderInventory() {
    const container = document.getElementById('inventory-list');
    if (!container) return;

    if (!character.items || character.items.length === 0) {
        container.innerHTML = '<div class="inventory-empty">Nessun oggetto. Aggiungi il tuo primo oggetto!</div>';
        return;
    }

    container.innerHTML = character.items.map((item, i) => {
        const isExpanded = item.expanded || false;
        return `
            <div class="item-row ${isExpanded ? 'expanded' : ''}" data-index="${i}">
                ${isExpanded ? `
                    <div class="item-main">
                        <input type="text" value="${escapeHtmlAttr(item.name || '')}"
                            onchange="updateItem(${i}, 'name', this.value)"
                            placeholder="Nome oggetto">
                        <div class="item-qty">
                            <button class="item-qty-btn" onclick="adjustItemQty(${i}, -1)">-</button>
                            <input type="number" value="${item.qty || 1}" min="0"
                                onchange="updateItem(${i}, 'qty', parseInt(this.value) || 1)">
                            <button class="item-qty-btn" onclick="adjustItemQty(${i}, 1)">+</button>
                        </div>
                        <button class="item-expand-btn expanded" onclick="toggleItemExpand(${i})">&#9660;</button>
                        <button class="remove-btn" onclick="removeItem(${i})">×</button>
                    </div>
                    <textarea class="item-notes"
                        placeholder="Note sull'oggetto..."
                        onchange="updateItem(${i}, 'notes', this.value)">${escapeHtml(item.notes || '')}</textarea>
                ` : `
                    <input type="text" value="${escapeHtmlAttr(item.name || '')}"
                        onchange="updateItem(${i}, 'name', this.value)"
                        placeholder="Nome oggetto">
                    <div class="item-qty">
                        <button class="item-qty-btn" onclick="adjustItemQty(${i}, -1)">-</button>
                        <input type="number" value="${item.qty || 1}" min="0"
                            onchange="updateItem(${i}, 'qty', parseInt(this.value) || 1)">
                        <button class="item-qty-btn" onclick="adjustItemQty(${i}, 1)">+</button>
                    </div>
                    <button class="item-expand-btn ${item.notes ? 'has-notes' : ''}" onclick="toggleItemExpand(${i})">&#9660;</button>
                    <button class="remove-btn" onclick="removeItem(${i})">×</button>
                `}
            </div>
        `;
    }).join('');
}

function addItem() {
    character.items.push({ name: '', qty: 1, notes: '', expanded: false });
    renderInventory();
    saveCharacter();
}

function updateItem(index, field, value) {
    character.items[index][field] = value;
    saveCharacter();
}

function removeItem(index) {
    character.items.splice(index, 1);
    renderInventory();
    saveCharacter();
}

function adjustItemQty(index, delta) {
    const newQty = Math.max(0, (character.items[index].qty || 1) + delta);
    character.items[index].qty = newQty;
    renderInventory();
    saveCharacter();
}

function toggleItemExpand(index) {
    character.items[index].expanded = !character.items[index].expanded;
    renderInventory();
    saveCharacter();
}

function escapeHtmlAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ==================== NOTES MANAGEMENT ====================

function showSheet() {
    document.getElementById('mainGrid').classList.remove('hidden');
    document.querySelector('.header').classList.remove('hidden');
    document.getElementById('notesPage').classList.add('hidden');
    document.getElementById('toggleSheet').classList.add('active');
    document.getElementById('toggleNotes').classList.remove('active');
}

function showNotes() {
    document.getElementById('mainGrid').classList.add('hidden');
    document.querySelector('.header').classList.add('hidden');
    document.getElementById('notesPage').classList.remove('hidden');
    document.getElementById('toggleSheet').classList.remove('active');
    document.getElementById('toggleNotes').classList.add('active');
    renderNotes();
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;

    if (!character.notes || character.notes.length === 0) {
        container.innerHTML = '<div class="notes-empty">Nessuna nota ancora. Aggiungi la tua prima nota!</div>';
        return;
    }

    // Sort by date descending (newest first)
    const sortedNotes = [...character.notes].sort((a, b) => b.id - a.id);

    container.innerHTML = sortedNotes.map(note => `
        <div class="note-item">
            <div class="note-header">
                <span class="note-date">${note.date}</span>
                <button class="note-delete-btn" onclick="deleteNote(${note.id})" title="Elimina nota">&times;</button>
            </div>
            <div class="note-content">${escapeHtml(note.content)}</div>
        </div>
    `).join('');
}

function addNote() {
    const input = document.getElementById('noteInput');
    const content = input.value.trim();

    if (!content) return;

    const today = new Date();
    const dateStr = today.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const newNote = {
        id: Date.now(),
        date: dateStr,
        content: content
    };

    character.notes.push(newNote);
    input.value = '';
    saveCharacter();
    renderNotes();
}

function deleteNote(id) {
    character.notes = character.notes.filter(note => note.id !== id);
    saveCharacter();
    renderNotes();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== BACKUP MANAGEMENT ====================

function downloadBackup() {
    const data = JSON.stringify(character, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `${characterConfig.id}-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSaveIndicator();
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Merge imported data with current character
            character = mergeWithDefaults(importedData, characterConfig.defaults);

            // Ensure required fields exist
            ensureRequiredFields();

            // Save to localStorage
            saveCharacter();

            // Reload UI
            loadStatValues();
            loadCombatValues();
            updateModifiers();
            generateAllPips();
            renderAttacks();

            // Reset file input
            event.target.value = '';

            alert('Backup importato con successo!');

        } catch (error) {
            console.error('Error importing backup:', error);
            alert('Errore durante l\'importazione del backup. Verifica che il file sia valido.');
        }
    };
    reader.readAsText(file);
}

// ==================== START ====================

// Load character when DOM is ready
document.addEventListener('DOMContentLoaded', loadCharacter);
