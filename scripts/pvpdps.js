const { calculatePvPStat } = require('../pvp-core.js');
const fs = require("node:fs");
const path = require("node:path");

const cache = {};
const result = [];
const cpCap = parseInt(process.argv[2]) || 1e8;

const {pokemon, moves, types} = JSON.parse(fs.readFileSync(path.join(__dirname, 'pvp.json'), 'utf8'));
const chargedSeconds = 10;
const preferRank1 = true;

function parseType(i) {
    const name = process.argv[i];
    const result = {};
    for (const type of Object.values(types)) if (type.typeName.localeCompare(name, undefined, {sensitivity: 'accent'}) === 0) {
        for (const {typeId} of type.weaknesses) result[typeId] = 1.6;
        for (const {typeId} of type.resistances) result[typeId] = .625;
        for (const {typeId} of type.immunes) result[typeId] = .390625;
        break;
    }
    return result;
}
const resistances1 = parseType(3);
const resistances2 = parseType(4);

function checkStats(pokemon, form, formData, pokemonData) {
    if (!formData.attack && !formData.quickMoves && !formData.chargedMoves && !formData.eliteQuickMoves && !formData.eliteChargedMoves && !formData.types) return;
    const stabTypes = new Set((formData.types || pokemonData.types).map((type) => type.typeId));
    let bestMoves = [];
    const addMoveset = (moveset) => {
        if (bestMoves.length > 0) {
            if (moveset.dps < bestMoves[0].dps) return;
            if (moveset.dps > bestMoves[0].dps) bestMoves = [];
        }
        bestMoves.push(moveset);
    };
    const canShadow = formData.purificationDust || !pokemonData && Object.values(formData.forms).some((form) => form.formName === 'Normal' && form.purificationDust);
    for (const quickMoveId of (formData.quickMoves || pokemonData.quickMoves).concat(formData.eliteQuickMoves || pokemonData && pokemonData.eliteQuickMoves || [])) {
        if (quickMoveId === 133) return;    // struggle???
        const quickMove = moves[quickMoveId];
        const turns = 1 + (quickMove.pvpDurationTurns ?? 0);
        const quickEpt = quickMove.pvpEnergyDelta / turns;
        if (!quickEpt) continue;
        const testQuickMove = (moveset, type) => {
            let quickDps = 1.28 * (quickMove.pvpPower ?? 0) / turns * (resistances1[type] ?? 1) * (resistances2[type] ?? 1);
            if (stabTypes.has(type)) quickDps *= 1.2;
            addMoveset({...moveset, dps: quickDps});
            return;
            const testChargedMove = (chargedMoveId) => {
                const chargedMove = moves[chargedMoveId];
                if (chargedMove.pvpBuffs && chargedMove.pvpBuffs.some((buff) => buff.buffActivationChance > 0 && (buff.attackerAttackStatStageChange < 0 || buff.targetDefenseStatStageChange > 0))) return;
                let chargedDamage = .64 * (chargedMove.pvpPower ?? 0) * (resistances1[chargedMove.type.typeId] ?? 1) * (resistances2[chargedMove.type.typeId] ?? 1);
                if (stabTypes.has(chargedMove.type.typeId)) chargedDamage *= 1.2;
                const quickTurns = chargedMove.pvpEnergyDelta / quickEpt;
                addMoveset({...moveset, charged: chargedMoveId, dps: (quickDps * quickTurns * -.5 + chargedDamage) / (quickTurns * -.5 + chargedSeconds)});
            };
            for (const moveId of (formData.chargedMoves || pokemonData.chargedMoves).concat(formData.eliteChargedMoves || pokemonData && pokemonData.eliteChargedMoves || [])) testChargedMove(moveId);
            if (false && canShadow) {
                testChargedMove(322);   // FRUSTRATION
                testChargedMove(323);   // RETURN
            }
        };
        if (quickMoveId === 281) for (let quickType = 2; quickType < 18; ++quickType) {
            testQuickMove({quick: quickMoveId, quickType}, quickType);
        } else testQuickMove({quick: quickMoveId}, quickMove.type.typeId);
    }
    if (bestMoves.length === 0) return;

    const stats = formData.attack ? formData : pokemonData;
    const key = `${stats.attack},${stats.defense},${stats.stamina}`;
    let value = cache[key];
    if (value === undefined) {
        let bestEntries = [];
        const ivFloor = stats.attack === 414 ? 10 : 0;  // hack for Deoxys Attack
        for (let a = ivFloor; a <= 15; a++) {
            for (let d = ivFloor; d <= 15; d++) {
                for (let s = ivFloor; s <= 15; s++) {
                    const entry = calculatePvPStat(stats, a, d, s, cpCap, 50);
                    if (!entry) continue;
                    if (!preferRank1) entry.value /= entry.attack;
                    if (bestEntries.length > 0) {
                        let delta;
                        if (preferRank1) {
                            delta = entry.value - bestEntries[0].value;
                            if (delta === 0) delta = entry.attack - bestEntries[0].attack;
                        } else {
                            delta = entry.attack - bestEntries[0].attack;
                            if (delta === 0) delta = entry.value - bestEntries[0].value;
                        }
                        if (delta < 0) continue;
                        if (delta > 0) bestEntries = [];
                    }
                    entry.iv = `${a}/${d}/${s}`;
                    bestEntries.push(entry);
                }
            }
        }
        cache[key] = value = bestEntries;
    }
    for (const entry of value) for (const moveset of bestMoves) {
        const row = {...entry, pokemon, form, ...moveset};
        row.dps *= entry.attack;
        result.push(row);
        if (!canShadow) continue;
        const shadow = {...row};
        shadow.shadow = true;
        shadow.dps *= 1.2;
        if (!preferRank1) shadow.value /= 1.2;
        result.push(shadow);
    }
}

for (const pokemonData of Object.values(pokemon)) {
    checkStats(pokemonData.pokemonName, null, pokemonData);
    for (const formData of Object.values(pokemonData.forms)) checkStats(pokemonData.pokemonName, formData.formName, formData, pokemonData);
    if (false && pokemonData.tempEvolutions) for (let [evoId, evoData] of Object.entries(pokemonData.tempEvolutions)) {
        if ((evoId = parseInt(evoId))) checkStats(pokemonData.pokemonName, ['', 'Mega', 'Mega X', 'Mega Y', 'Primal', 'Mega Z'][evoId], evoData, pokemonData);
    }
}
result.sort((a, b) => {
    const r = b.dps - a.dps;
    return r === 0 ? b.value - a.value : r;
});
console.log('#\tPokemon\tForm\tAlignment\tIV\tLevel\tCP\tQuick\tCharged\tDPS\tTDO');
let i = 0;
for (const row of result) console.log(`${++i}\t${row.pokemon}\t` + (row.form ? row.form : '') + '\t' +
    (row.shadow ? 'Shadow' : '') + `\t${row.iv}\t${row.level}\t${row.cp}\t` + moves[row.quick].name +
    (row.quickType ? ' ' + types[row.quickType].typeName : '') + `\t` +
    (row.charged ? moves[row.charged].name : '') +
    `\t${row.dps.toFixed(2)}\t${((preferRank1 ? row.value / row.attack : row.value) * row.dps / 1000000).toFixed(2)}`);
