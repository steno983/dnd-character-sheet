# D&D Character Sheet - Multi-Character Template

Webapp single-page per schede personaggio D&D 5e 2024 con template unico e dati JSON esterni.

## Repository

- **GitHub**: https://github.com/steno983/dnd-character-sheet
- **GitHub Pages**: https://steno983.github.io/dnd-character-sheet/

## Personaggi Disponibili

- **Tholgrin** (Chierico Lv.7, Dominio della Luce) - `index.html?char=tholgrin`
- **Sylan D'Thuranni** (Mago Lv.4, Scuola di Divinazione) - `index.html?char=sylan`

## Stack Tecnico

- HTML/CSS/JS vanilla (template modulare)
- Dati personaggio in JSON esterni
- localStorage per persistenza dati (chiave separata per personaggio)
- Temi CSS variabili (burgundy/gold per chierico, purple/blue per mago)
- Google Fonts (Cinzel, Crimson Text)

## Struttura File

```
/Users/steno/Dev/ded/
├── index.html                  # Template HTML unico
├── css/
│   ├── base.css                # Stili comuni
│   └── themes/
│       ├── cleric.css          # Tema burgundy/gold (chierico)
│       └── wizard.css          # Tema purple/blue (mago)
├── js/
│   ├── app.js                  # Logica principale e inizializzazione
│   ├── spells.js               # Sistema incantesimi e modal
│   └── skills.js               # Sistema abilita (roll, proficiency)
├── data/
│   ├── characters/
│   │   ├── tholgrin.json       # Config Tholgrin (Chierico Lv.7)
│   │   └── sylan.json          # Config Sylan (Mago Lv.4)
│   └── spells/
│       ├── cleric.json         # Spell database chierico
│       └── wizard.json         # Spell database mago
├── backup/
│   ├── index.html              # Backup versione monolitica chierico
│   └── sylan.html              # Backup versione monolitica mago
├── spells.txt                  # Lista incantesimi originale
└── CLAUDE.md                   # Questo file
```

## Schema JSON Personaggio

```json
{
  "id": "tholgrin",
  "name": "Tholgrin",
  "class": "Chierico",
  "level": 7,
  "subclass": "Dominio della Luce",
  "theme": "cleric",
  "layout": "cleric-layout",
  "statsLayout": "vertical",
  "storageKey": "dnd-cleric-7-light",
  "spellsFile": "spells/cleric.json",

  "proficiencyBonus": 3,
  "spellcastingAbility": "wisdom",
  "hitDiceType": "d8",

  "defaults": {
    "name": "Tholgrin",
    "stats": { ... },
    "hp": { "current": 77, "max": 77, "temp": 0 },
    "armorClass": 19,
    "speed": 30,
    "hitDice": { "current": 7, "max": 7 },
    "attacks": [],
    "skillProficiencies": []
  },

  "spellSlots": [
    { "level": 1, "max": 4 },
    { "level": 2, "max": 3 },
    { "level": 3, "max": 3 },
    { "level": 4, "max": 1 }
  ],

  "classFeatures": {
    "channelDivinity": { "enabled": true, "uses": 2, "resetOn": "shortRest", "abilities": [...] },
    "wardingFlare": { "enabled": true, "usesBasedOn": "wisdom", "description": "..." },
    "portent": { "enabled": false },
    "mageArmor": { "enabled": false },
    "detectMagic": { "enabled": false },
    "alert": { "enabled": false },
    "skills": { "enabled": false },
    "abilities": []
  },

  "spells": {
    "cantrips": ["guidance", "light", "toll-the-dead", "word-of-radiance"],
    "level1": ["healing-word", "shield-of-faith", ...],
    "level2": [...],
    "level3": [...],
    "level4": [...]
  }
}
```

## Come Caricare un Personaggio

URL: `index.html?char=<id>` (es. `index.html?char=tholgrin` o `index.html?char=sylan`)

Se non specificato, default e `tholgrin`.

## Variabili CSS Tema

I temi CSS definiscono variabili per personalizzare colori:

```css
:root {
  --primary: #6b1c23;           /* Colore principale */
  --primary-dark: #4a1218;
  --accent: #b8860b;            /* Colore accento */
  --slot-filled: #daa520;       /* Colore pip attivi */
  --resource-color: #1e3a5f;    /* Colore sezione risorse */
  /* ... e molti altri */
}
```

## Class Features Supportate

Il sistema supporta le seguenti feature di classe (abilitate/disabilitate nel JSON):

- **Channel Divinity** (Chierico): Usi, reset su riposo breve
- **Warding Flare** (Chierico): Usi basati su mod SAG
- **Portent** (Mago): 2 dadi d20, modal per nuovo giorno
- **Mage Armor** (Mago): Toggle CA 13 + DEX
- **Detect Magic** (razziale): 1/giorno
- **Alert** (talento): +5 iniziativa
- **Skills**: Sistema abilita con proficiency e roll

## Aggiungere un Nuovo Personaggio

1. Crea `data/characters/<id>.json` con la config del personaggio
2. Crea `data/spells/<class>.json` se necessario con gli incantesimi
3. Crea `css/themes/<theme>.css` se serve un nuovo tema
4. Accedi con `index.html?char=<id>`

## Aggiungere un Nuovo Incantesimo

1. Aggiungi entry nel file JSON corrispondente in `data/spells/`:
```json
"spell-key": {
  "name": "Nome Italiano",
  "level": "1° livello",
  "school": "Scuola",
  "castingTime": "Azione",
  "range": "18 metri",
  "components": "V, S, M (materiali)",
  "duration": "Istantaneo",
  "description": "<p>Descrizione HTML</p>",
  "higherLevel": "Descrizione livelli superiori (opzionale)",
  "domain": false,
  "racial": false,
  "dice": { "attack": true, "damage": "4d6", "damageType": "radianti" }
}
```

2. Aggiungi la key nell'array spells del personaggio in `data/characters/<id>.json`:
```json
"spells": {
  "level1": ["spell-key", ...]
}
```

## Level Up

Per aumentare di livello un personaggio:

1. Modifica `level` e `proficiencyBonus` in `data/characters/<id>.json`
2. Aggiorna `hitDice.max` nei defaults
3. Aggiorna `spellSlots` con i nuovi slot
4. Aggiungi nuovi incantesimi all'array `spells`
5. Aggiungi/modifica `classFeatures` se necessario

## localStorage Keys

- Tholgrin: `dnd-cleric-7-light`
- Sylan: `dnd-wizard-4-divination`

Ogni personaggio salva i propri dati separatamente.

## Funzioni JavaScript Principali

### app.js
- `loadCharacter()` - Carica config JSON e inizializza
- `loadTheme(themeName)` - Carica CSS tema dinamicamente
- `saveCharacter()` - Salva in localStorage
- `updateModifiers()` - Aggiorna modificatori e valori derivati
- `shortRest(btn)` / `longRest(btn)` - Gestione riposi

### spells.js
- `openSpell(spellId)` - Apre modal incantesimo
- `rollDice(notation)` - Lancia dadi (es. "2d6")
- `rollAttack()` / `rollDamage()` / `rollHealing()` - Tiri specifici

### skills.js
- `renderSkills()` - Genera griglia abilita
- `rollSkillCheck(skillKey)` - Effettua prova abilita
- `toggleSkillProficiency(skillKey)` - Toggle competenza
