const { calculateCp, calculateCpMultiplier } = require('../pvp-core.js');
const fs = require("node:fs");
const path = require("node:path");

const result = [];

const {pokemon, types, moves} = JSON.parse(fs.readFileSync(path.join(__dirname, 'pve.json'), 'utf8'));
const dynamaxCannonBonus = 0;//60;

function parseType(i) {
    const name = process.argv[i];
    const result = {};
    for (const type of Object.values(types)) if (type.typeName.localeCompare(name, undefined, {sensitivity: 'accent'}) === 0) {
        for (const {typeId} of type.strengths) result[typeId] = .625;
        for (const {typeId} of type.weakAgainst) result[typeId] = 1.6;
        for (const {typeId} of type.veryWeakAgainst) result[typeId] = 2.56;
        break;
    }
    return result;
}
const resistances = parseType(2);

const calculatePvPStat = (stats, attack, defense, stamina, cap, lvCap, minLevel = 1) => {
    let bestCP = calculateCp(stats, attack, defense, stamina, minLevel);
    if (bestCP > cap) return null;
    let lowest = minLevel, highest = lvCap;
    for (let mid = Math.ceil(lowest + highest) / 2; lowest < highest; mid = Math.ceil(lowest + highest) / 2) {
        const cp = calculateCp(stats, attack, defense, stamina, mid);
        if (cp <= cap) {
            lowest = mid;
            bestCP = cp;
        } else highest = mid - .5;
    }
    const multiplier = calculateCpMultiplier(lowest);
    const atk = (attack + stats.attack) * multiplier;
    let hp = (stamina + stats.stamina) * multiplier;
    hp = hp < 10 ? 10 : Math.floor(hp);
    return { attack: atk, defense: (defense + stats.defense) * multiplier, hp, level: lowest, cp: bestCP };
};

function checkStats(pokemon, form, formData, pokemonData, hpShield = 180) {
    if (!formData.attack && !formData.quickMoves && !formData.eliteQuickMoves && !formData.types) return;
    const stats = formData.attack ? formData : pokemonData;
    const entry = calculatePvPStat(stats, 15, 15, 15, 1e8, 50, 50);
    if (!entry) return;
    const row = {...entry, pokemon, form, gmax: formData.gmaxMove};
    if (!(form || '').startsWith('Crowned')) hpShield += dynamaxCannonBonus;
    row.bulk = entry.defense * (entry.hp + hpShield) * .001;
    (formData.types || pokemonData.types).forEach(({typeId}) => {
        const r = resistances[typeId];
        if (r) row.bulk *= r;
    });
    row.value = row.bulk * row.attack;
    row.fast = Infinity;
    for (const quickMoveId of (formData.quickMoves || pokemonData.quickMoves).concat(formData.eliteQuickMoves || pokemonData && pokemonData.eliteQuickMoves || [])) {
        if (quickMoveId === 133) return;    // struggle???
        row.fast = Math.min(row.fast, moves[quickMoveId].durationMs);
    }
    if (!isFinite(row.fast)) return;
    result.push(row);
}

for (const pokemonData of Object.values(pokemon)) {
    if (pokemonData.pokemonName !== 'Zacian' && pokemonData.pokemonName !== 'Zamazenta' && pokemonData.pokemonName !== 'Urshifu') checkStats(pokemonData.pokemonName, null, pokemonData);
    for (const formData of Object.values(pokemonData.forms)) if (formData.formName !== 'Complete Ten Percent') {
        checkStats(pokemonData.pokemonName, formData.formName, formData, pokemonData);
        if (formData.formName === 'Crowned Shield') checkStats(pokemonData.pokemonName, 'Crowned 4x', formData, pokemonData, 240);
    }
}
result.sort((a, b) => {
    const r = b.bulk - a.bulk;
    return r === 0 ? b.value - a.value : r;
});
console.log('Pokemon\tForm\tLevel\tCP\tBulk\tTDO\tFast\tGmax');
// let i = 0;
for (const row of result) console.log(`${row.pokemon}\t` + (row.form ? row.form : '') +
    `\t${row.level}\t${row.cp}\t${row.bulk.toFixed(2)}\t${row.value.toFixed(2)}\t${row.fast / 500}\t${row.gmax || ''}`);
