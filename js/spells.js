// D&D Character Sheet - Spell System

let currentSpell = null;

// ==================== MODAL FUNCTIONS ====================

function openSpell(spellId) {
    const spell = spellDatabase[spellId];
    if (!spell) return;

    currentSpell = spell;

    const typeIcon = spell.type ? getSpellTypeIcon(spell.type) + ' ' : '';
    document.getElementById('spellModalName').innerHTML = `${typeIcon}${spell.name}`;
    document.getElementById('spellModalMeta').textContent = `${spell.level} - ${spell.school}`;
    document.getElementById('spellCastingTime').textContent = spell.castingTime;
    document.getElementById('spellRange').textContent = spell.range;
    document.getElementById('spellComponents').textContent = spell.components;
    document.getElementById('spellDuration').textContent = spell.duration;
    document.getElementById('spellDescription').innerHTML = spell.description;

    const header = document.getElementById('spellModalHeader');
    header.className = 'spell-modal-header';
    if (spell.domain) header.classList.add('domain');
    if (spell.racial) header.classList.add('racial');

    const higherLevel = document.getElementById('spellHigherLevel');
    if (spell.higherLevel) {
        document.getElementById('spellHigherLevelText').textContent = spell.higherLevel;
        higherLevel.style.display = 'block';
    } else {
        higherLevel.style.display = 'none';
    }

    setupDiceButtons(spell);

    document.getElementById('spellModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSpellModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('spellModal').classList.remove('active');
    document.body.style.overflow = '';
    currentSpell = null;
}

function setupDiceButtons(spell) {
    const diceSection = document.getElementById('diceSection');
    const diceButtons = document.getElementById('diceButtons');
    const diceResult = document.getElementById('diceResult');

    diceResult.classList.remove('show');
    diceButtons.innerHTML = '';

    if (!spell.dice) {
        diceSection.style.display = 'none';
        return;
    }

    diceSection.style.display = 'block';
    const dice = spell.dice;

    // Attack button
    if (dice.attack) {
        const attackBtn = document.createElement('button');
        attackBtn.className = 'dice-btn dice-btn-attack';
        attackBtn.innerHTML = '<span class="dice-icon">&#127919;</span> Tiro per Colpire';
        attackBtn.onclick = () => rollAttack(dice.rays || 1);
        diceButtons.appendChild(attackBtn);
    }

    // Save DC display
    if (dice.save) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'dice-btn dice-btn-save';
        const spellDC = document.getElementById('spell-dc').textContent;
        saveBtn.innerHTML = `<span class="dice-icon">&#128737;</span> CD ${spellDC} (TS ${dice.save})`;
        saveBtn.onclick = () => showSaveDC(dice.save);
        diceButtons.appendChild(saveBtn);
    }

    // Damage button
    if (dice.damage) {
        const dmgBtn = document.createElement('button');
        dmgBtn.className = 'dice-btn dice-btn-damage';
        dmgBtn.innerHTML = `<span class="dice-icon">&#128165;</span> Danni (${dice.damage})`;
        dmgBtn.onclick = () => rollDamage(dice.damage, dice.damageType);
        diceButtons.appendChild(dmgBtn);
    }

    // Alt damage (like Toll the Dead)
    if (dice.damageAlt) {
        const dmgAltBtn = document.createElement('button');
        dmgAltBtn.className = 'dice-btn dice-btn-damage';
        dmgAltBtn.innerHTML = `<span class="dice-icon">&#128128;</span> ${dice.damageAltLabel} (${dice.damageAlt})`;
        dmgAltBtn.onclick = () => rollDamage(dice.damageAlt, dice.damageType);
        diceButtons.appendChild(dmgAltBtn);
    }

    // Healing button
    if (dice.healing) {
        const healBtn = document.createElement('button');
        healBtn.className = 'dice-btn dice-btn-heal';
        const abilityLabel = characterConfig.spellcastingAbility === 'wisdom' ? 'SAG' : 'INT';
        const modText = dice.healingMod ? ` + ${abilityLabel}` : '';
        healBtn.innerHTML = `<span class="dice-icon">&#128154;</span> Cura (${dice.healing}${modText})`;
        healBtn.onclick = () => rollHealing(dice.healing, dice.healingMod);
        diceButtons.appendChild(healBtn);
    }

    // Bonus roll (like Guidance)
    if (dice.bonus) {
        const bonusBtn = document.createElement('button');
        bonusBtn.className = 'dice-btn dice-btn-attack';
        bonusBtn.innerHTML = `<span class="dice-icon">&#10024;</span> ${dice.bonusLabel} (${dice.bonus})`;
        bonusBtn.onclick = () => rollBonus(dice.bonus, dice.bonusLabel);
        diceButtons.appendChild(bonusBtn);
    }
}

// ==================== DICE ROLLING ====================

function rollDice(notation) {
    const match = notation.match(/(\d+)d(\d+)/);
    if (!match) return { total: 0, rolls: [], max: 0 };

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const rolls = [];
    let total = 0;

    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push({ value: roll, max: sides });
        total += roll;
    }

    return { total, rolls, max: sides };
}

function displayResult(label, total, breakdown, type, extraClass = '') {
    const resultDiv = document.getElementById('diceResult');
    const totalDiv = document.getElementById('diceResultTotal');

    document.getElementById('diceResultLabel').textContent = label;
    totalDiv.textContent = total;
    totalDiv.className = 'dice-result-total ' + extraClass;
    document.getElementById('diceResultBreakdown').innerHTML = breakdown;
    document.getElementById('diceResultType').textContent = type;

    resultDiv.classList.remove('show');
    void resultDiv.offsetWidth; // Trigger reflow
    resultDiv.classList.add('show');
}

function rollAttack(rays = 1) {
    const spellAttack = parseInt(document.getElementById('spell-attack').textContent) || 0;
    let resultsHtml = '';
    let allResults = [];

    for (let r = 0; r < rays; r++) {
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + spellAttack;
        const isCrit = roll === 20;
        const isCritFail = roll === 1;

        let dieClass = '';
        if (isCrit) dieClass = 'max';
        if (isCritFail) dieClass = 'min';

        const rayLabel = rays > 1 ? `Raggio ${r + 1}: ` : '';
        resultsHtml += `${rayLabel}<span class="die ${dieClass}">${roll}</span> + ${spellAttack} = <strong>${total}</strong>${isCrit ? ' CRITICO!' : ''}${isCritFail ? ' FALLIMENTO!' : ''}<br>`;
        allResults.push({ roll, total, isCrit, isCritFail });
    }

    const mainResult = allResults[0];
    let extraClass = '';
    if (rays === 1) {
        if (mainResult.isCrit) extraClass = 'crit';
        if (mainResult.isCritFail) extraClass = 'critfail';
    }

    const displayTotal = rays === 1 ? mainResult.total : allResults.map(r => r.total).join(' / ');
    displayResult('Tiro per Colpire', displayTotal, resultsHtml, 'vs CA bersaglio', extraClass);
}

function rollDamage(notation, damageType) {
    const result = rollDice(notation);
    const breakdown = result.rolls.map(r => {
        let cls = '';
        if (r.value === r.max) cls = 'max';
        if (r.value === 1) cls = 'min';
        return `<span class="die ${cls}">${r.value}</span>`;
    }).join(' + ');

    displayResult('Danni', result.total, breakdown + ` = ${result.total}`, `danni ${damageType}`);
}

function rollHealing(notation, addMod) {
    const result = rollDice(notation);
    const spellAbility = characterConfig.spellcastingAbility;
    const spellMod = calculateModifier(parseInt(character.stats[spellAbility]) || 10);
    const abilityLabel = spellAbility === 'wisdom' ? 'SAG' : 'INT';

    let total = result.total;
    let breakdown = result.rolls.map(r => {
        let cls = '';
        if (r.value === r.max) cls = 'max';
        if (r.value === 1) cls = 'min';
        return `<span class="die ${cls}">${r.value}</span>`;
    }).join(' + ');

    if (addMod) {
        total += spellMod;
        breakdown += ` + ${spellMod} (${abilityLabel})`;
    }

    breakdown += ` = ${total}`;
    displayResult('Cura', total, breakdown, 'punti ferita recuperati');
}

function rollBonus(notation, label) {
    const result = rollDice(notation);
    const breakdown = result.rolls.map(r => {
        let cls = '';
        if (r.value === r.max) cls = 'max';
        if (r.value === 1) cls = 'min';
        return `<span class="die ${cls}">${r.value}</span>`;
    }).join(' + ');

    displayResult(label, '+' + result.total, breakdown, 'da aggiungere alla prova');
}

function showSaveDC(saveType) {
    const spellDC = document.getElementById('spell-dc').textContent;
    displayResult('Tiro Salvezza', `CD ${spellDC}`, `Il bersaglio deve effettuare un <strong>TS ${saveType}</strong>`, `Fallimento = effetto pieno / Successo = metà o nessuno`);
}
