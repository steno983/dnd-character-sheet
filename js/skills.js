// D&D Character Sheet - Skills System

// Skills Configuration
const SKILLS = {
    // Forza
    athletics: { name: 'Atletica', stat: 'strength' },
    // Destrezza
    acrobatics: { name: 'Acrobazia', stat: 'dexterity' },
    stealth: { name: 'Furtivita', stat: 'dexterity' },
    sleightOfHand: { name: 'Rapidita di Mano', stat: 'dexterity' },
    // Intelligenza
    arcana: { name: 'Arcano', stat: 'intelligence' },
    investigation: { name: 'Indagare', stat: 'intelligence' },
    nature: { name: 'Natura', stat: 'intelligence' },
    religion: { name: 'Religione', stat: 'intelligence' },
    history: { name: 'Storia', stat: 'intelligence' },
    // Saggezza
    animalHandling: { name: 'Addestrare Animali', stat: 'wisdom' },
    insight: { name: 'Intuizione', stat: 'wisdom' },
    medicine: { name: 'Medicina', stat: 'wisdom' },
    perception: { name: 'Percezione', stat: 'wisdom' },
    survival: { name: 'Sopravvivenza', stat: 'wisdom' },
    // Carisma
    deception: { name: 'Inganno', stat: 'charisma' },
    intimidation: { name: 'Intimidire', stat: 'charisma' },
    performance: { name: 'Intrattenere', stat: 'charisma' },
    persuasion: { name: 'Persuasione', stat: 'charisma' }
};

const SKILL_GROUPS = {
    'Forza': ['athletics'],
    'Destrezza': ['acrobatics', 'stealth', 'sleightOfHand'],
    'Intelligenza': ['arcana', 'investigation', 'nature', 'religion', 'history'],
    'Saggezza': ['animalHandling', 'insight', 'medicine', 'perception', 'survival'],
    'Carisma': ['deception', 'intimidation', 'performance', 'persuasion']
};

// ==================== SKILLS FUNCTIONS ====================

function calculateSkillBonus(skillKey) {
    const skill = SKILLS[skillKey];
    const statScore = parseInt(character.stats[skill.stat]) || 10;
    const statMod = calculateModifier(statScore);

    // Check for skill proficiencies in character data
    if (!character.skillProficiencies) {
        character.skillProficiencies = characterConfig.defaults.skillProficiencies || [];
    }

    const isProficient = character.skillProficiencies.includes(skillKey);
    return statMod + (isProficient ? characterConfig.proficiencyBonus : 0);
}

function renderSkills() {
    const container = document.getElementById('skills-grid');
    if (!container) return;

    container.innerHTML = '';

    // Ensure skillProficiencies exists
    if (!character.skillProficiencies) {
        character.skillProficiencies = characterConfig.defaults.skillProficiencies || [];
    }

    for (const [groupName, skillKeys] of Object.entries(SKILL_GROUPS)) {
        const group = document.createElement('div');
        group.className = 'skill-group';

        const title = document.createElement('div');
        title.className = 'skill-group-title';
        title.textContent = groupName;
        group.appendChild(title);

        skillKeys.forEach(skillKey => {
            const skill = SKILLS[skillKey];
            const bonus = calculateSkillBonus(skillKey);
            const isProficient = character.skillProficiencies.includes(skillKey);

            const item = document.createElement('div');
            item.className = 'skill-item' + (isProficient ? ' proficient' : '');
            item.dataset.skill = skillKey;

            const dot = document.createElement('span');
            dot.className = 'proficiency-dot';
            dot.onclick = (e) => { e.stopPropagation(); toggleSkillProficiency(skillKey); };

            const nameSpan = document.createElement('span');
            nameSpan.className = 'skill-name';
            nameSpan.textContent = skill.name;

            const bonusSpan = document.createElement('span');
            bonusSpan.className = 'skill-bonus';
            bonusSpan.textContent = formatModifier(bonus);

            item.onclick = () => rollSkillCheck(skillKey);
            item.appendChild(dot);
            item.appendChild(nameSpan);
            item.appendChild(bonusSpan);

            group.appendChild(item);
        });

        container.appendChild(group);
    }
}

function updateSkillBonuses() {
    const items = document.querySelectorAll('.skill-item');
    items.forEach(item => {
        const skillKey = item.dataset.skill;
        if (!skillKey) return;

        const bonus = calculateSkillBonus(skillKey);
        const isProficient = character.skillProficiencies?.includes(skillKey) || false;

        item.classList.toggle('proficient', isProficient);
        const bonusSpan = item.querySelector('.skill-bonus');
        if (bonusSpan) {
            bonusSpan.textContent = formatModifier(bonus);
        }
    });
}

function rollSkillCheck(skillKey) {
    const skill = SKILLS[skillKey];
    const bonus = calculateSkillBonus(skillKey);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + bonus;

    const isCrit = roll === 20;
    const isCritFail = roll === 1;

    let dieClass = '';
    if (isCrit) dieClass = 'max';
    if (isCritFail) dieClass = 'min';

    const toast = document.getElementById('skillToast');
    const nameEl = document.getElementById('skillToastName');
    const resultEl = document.getElementById('skillToastResult');
    const breakdownEl = document.getElementById('skillToastBreakdown');

    nameEl.textContent = skill.name;
    resultEl.textContent = total;
    resultEl.className = 'skill-toast-result';
    if (isCrit) resultEl.classList.add('crit');
    if (isCritFail) resultEl.classList.add('critfail');

    const bonusStr = bonus >= 0 ? `+ ${bonus}` : `- ${Math.abs(bonus)}`;
    breakdownEl.innerHTML = `<span class="die ${dieClass}">${roll}</span> ${bonusStr} = ${total}`;

    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
}

function closeSkillToast() {
    document.getElementById('skillToast').classList.remove('show');
}

function toggleSkillProficiency(skillKey) {
    if (!character.skillProficiencies) {
        character.skillProficiencies = [];
    }

    const index = character.skillProficiencies.indexOf(skillKey);
    if (index > -1) {
        character.skillProficiencies.splice(index, 1);
    } else {
        character.skillProficiencies.push(skillKey);
    }
    updateSkillBonuses();
    saveCharacter();
}
