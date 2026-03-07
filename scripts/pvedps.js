const { calculatePvPStat } = require('../pvp-core.js');
const fs = require("node:fs");
const path = require("node:path");

const result = [];

const {pokemon, moves, types} = JSON.parse(fs.readFileSync(path.join(__dirname, 'pve.json'), 'utf8'));

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
const partyCount = parseInt(process.argv[2]) ?? 0;  // 0 = gym; 1 = raid; 2-4 = raid with party power
const resistances1 = parseType(3);
const resistances2 = parseType(4);
const partyQuicks = [0, 0, -18, -9, -6][partyCount];

function durationMs(move) {
    if (move.durationMs % 500) console.warn(`WEE WOO ${move}`);
    return partyCount ? Math.round(move.durationMs / 500) * 500 : move.durationMs;
}
function durationMultiplier(move) {
    const multiplier = move.durationMs / durationMs(move);
    return multiplier > .8 && multiplier < 1.2 ? 1 : 2 - multiplier;
}
function shouldSkipChargedMove(chargedMoveId, candidateChargedMoveIds) {
    const chargedMove = moves[chargedMoveId];
    if (partyCount || chargedMove.energyDelta >= -50) return false;
    const hasSameTypeTwoBar = candidateChargedMoveIds.some((candidateMoveId) => {
        if (candidateMoveId === chargedMoveId) return false;
        const candidateMove = moves[candidateMoveId];
        return candidateMove.energyDelta >= -50 && candidateMove.type.typeId === chargedMove.type.typeId;
    });
    return !hasSameTypeTwoBar;
}

function checkStats(pokemon, form, formData, pokemonData, specialMove = 323) {  // RETURN
    if (!formData.attack && !formData.quickMoves && !formData.chargedMoves && !formData.eliteQuickMoves && !formData.eliteChargedMoves && !formData.types) return;
    const stabTypes = new Set((formData.types || pokemonData.types).map((type) => type.typeId));
    const chargedMoveIds = (formData.chargedMoves || pokemonData.chargedMoves).concat(formData.eliteChargedMoves || pokemonData && pokemonData.eliteChargedMoves || []);
    let bestMoves = [];
    const addMoveset = (moveset) => {
        if (bestMoves.length > 0) {
            if (moveset.dps < bestMoves[0].dps) return;
            if (moveset.dps > bestMoves[0].dps) bestMoves = [];
        }
        bestMoves.push(moveset);
    };
    let canShadow = formData.purificationDust || !pokemonData && Object.values(formData.forms).some((form) => form.formName === 'Normal' && form.purificationDust);
    let canStruggle = false;
    for (const quickMoveId of (formData.quickMoves || pokemonData.quickMoves).concat(formData.eliteQuickMoves || pokemonData && pokemonData.eliteQuickMoves || [])) {
        if (quickMoveId === 133) return;    // struggle???
        const quickMove = moves[quickMoveId];
        const quickEpms = quickMove.energyDelta / durationMs(quickMove);
        if (!quickEpms) continue;
        const testQuickMove = (moveset, type) => {
            let quickDps = 500 * (quickMove.power ?? 0) / durationMs(quickMove) * (resistances1[type] ?? 1) * (resistances2[type] ?? 1);
            if (stabTypes.has(type)) quickDps *= 1.2;
            if (partyCount) quickDps *= durationMultiplier(quickMove);
            addMoveset({...moveset, dps: quickDps});
            const testChargedMove = (chargedMoveId) => {
                const chargedMove = moves[chargedMoveId];
                if (chargedMoveId === 133) {
                    canStruggle = true;
                    if (partyQuicks) for (let quicks = -1; quicks >= partyQuicks; --quicks) {
                        let chargedDamage = 500 * (chargedMove.power ?? 0) * (resistances1[chargedMove.type.typeId] ?? 1) * (resistances2[chargedMove.type.typeId] ?? 1) * (1 + quicks / partyQuicks);
                        if (stabTypes.has(chargedMove.type.typeId)) chargedDamage *= 1.2;
                        const quickMs = durationMs(quickMove) * quicks;
                        addMoveset({...moveset, charged: chargedMoveId, quicks, dps: (chargedDamage - quickMs * quickDps) / (durationMs(chargedMove) - quickMs)});
                    }
                    return;
                }
                if (!chargedMove.energyDelta) {
                    console.warn(`WEE WOO ${chargedMoveId} learned by ${pokemon} ${form}`);
                    return;
                }
                if (shouldSkipChargedMove(chargedMoveId, chargedMoveIds)) return;
                let chargedDamage = 500 * (chargedMove.power ?? 0) * (resistances1[chargedMove.type.typeId] ?? 1) * (resistances2[chargedMove.type.typeId] ?? 1);
                if (stabTypes.has(chargedMove.type.typeId)) chargedDamage *= 1.2;
                if (partyCount) chargedDamage *= durationMultiplier(chargedMove);
                if (partyQuicks) chargedDamage *= 1 + Math.min(1, chargedMove.energyDelta / (partyQuicks * quickMove.energyDelta));
                const quickMs = chargedMove.energyDelta / quickEpms;
                addMoveset({...moveset, charged: chargedMoveId, dps: (chargedDamage - quickMs * quickDps) / (durationMs(chargedMove) - quickMs)});
            };
            for (const moveId of chargedMoveIds) testChargedMove(moveId);
            if (canShadow) testChargedMove(specialMove);    // RETURN
        };
        if (quickMoveId === 281) for (let quickType = 2; quickType < 18; ++quickType) {
            testQuickMove({quick: quickMoveId, quickType}, quickType);
        } else testQuickMove({quick: quickMoveId}, quickMove.type.typeId);
    }
    if (canStruggle) {
        const struggle = moves[133];
        let dps = 500 * struggle.power * (resistances1[struggle.type.typeId] ?? 1) * (resistances2[struggle.type.typeId] ?? 1) / durationMs(struggle);
        if (stabTypes.has(struggle.type.typeId)) dps *= 1.2;
        addMoveset({charged: 133, dps});
    }
    if (bestMoves.length === 0) return;

    const stats = formData.attack ? formData : pokemonData;
    const entry = calculatePvPStat(stats, 15, 15, 15, 1e8, 50, 50);
    if (!entry) return;
    if (bestMoves.every((move) => move.charged === 323)) {
        checkStats(pokemon, form, formData, pokemonData, 322);  // FRUSTRATION
        canShadow = false;
    }
    for (const moveset of bestMoves) {
        const row = {...entry, pokemon, form, ...moveset};
        row.value *= row.dps / 1000000;
        row.dps *= entry.attack;
        if (specialMove === 323) result.push(row);
        if (!canShadow) continue;
        const shadow = {...row};
        shadow.shadow = 'Shadow';
        shadow.dps *= 1.2;
        result.push(shadow);
    }
}

function checkSpecial(pokemon, shadow, formData, chargedMoveId) {
    const chargedMoveIds = formData.chargedMoves.concat(formData.eliteChargedMoves || []);
    if (shouldSkipChargedMove(chargedMoveId, chargedMoveIds)) return;
    const chargedMove = moves[chargedMoveId];
    const stabTypes = new Set(formData.types.map((type) => type.typeId));
    let bestMoves = [];
    const addMoveset = (moveset) => {
        if (bestMoves.length > 0) {
            if (moveset.dps < bestMoves[0].dps) return;
            if (moveset.dps > bestMoves[0].dps) bestMoves = [];
        }
        bestMoves.push(moveset);
    };
    for (const quickMoveId of formData.quickMoves.concat(formData.eliteQuickMoves || [])) {
        if (quickMoveId === 133) return;    // struggle???
        const quickMove = moves[quickMoveId];
        const quickEpms = quickMove.energyDelta / durationMs(quickMove);
        if (!quickEpms) continue;
        const testQuickMove = (moveset, type) => {
            let quickDps = 500 * (quickMove.power ?? 0) / durationMs(quickMove) * (resistances1[type] ?? 1) * (resistances2[type] ?? 1);
            if (stabTypes.has(type)) quickDps *= 1.2;
            let chargedDamage = 500 * (chargedMove.power ?? 0) * (resistances1[chargedMove.type.typeId] ?? 1) * (resistances2[chargedMove.type.typeId] ?? 1);
            if (stabTypes.has(chargedMove.type.typeId)) chargedDamage *= 1.2;
            if (partyQuicks) chargedDamage *= 1 + Math.min(1, chargedMove.energyDelta / (partyQuicks * quickMove.energyDelta));
            const quickMs = chargedMove.energyDelta / quickEpms;
            addMoveset({...moveset, charged: chargedMoveId, dps: (chargedDamage - quickMs * quickDps) / (durationMs(chargedMove) - quickMs)});
        };
        if (quickMoveId === 281) for (let quickType = 2; quickType < 18; ++quickType) {
            testQuickMove({quick: quickMoveId, quickType}, quickType);
        } else testQuickMove({quick: quickMoveId}, quickMove.type.typeId);
    }

    const stats = formData.attack ? formData : pokemonData;
    const entry = calculatePvPStat(stats, 15, 15, 15, 1e8, 50, 50);
    if (!entry) return;
    for (const moveset of bestMoves) {
        const row = {...entry, pokemon, shadow, ...moveset};
        row.value *= row.dps / 1000000;
        row.dps *= entry.attack;
        if (shadow.endsWith('Shadow')) row.dps *= 1.2;
        result.push(row);
    }
}

for (const pokemonData of Object.values(pokemon)) {
    checkStats(pokemonData.pokemonName, null, pokemonData);
    for (const formData of Object.values(pokemonData.forms)) checkStats(pokemonData.pokemonName, formData.formName, formData, pokemonData);
    if (pokemonData.tempEvolutions) for (let [evoId, evoData] of Object.entries(pokemonData.tempEvolutions)) {
        if ((evoId = parseInt(evoId))) checkStats(pokemonData.pokemonName, ['', 'Mega', 'Mega X', 'Mega Y', 'Primal', 'Mega Z'][evoId], evoData, pokemonData);
    }
}
checkSpecial('Lugia', 'Apex Shadow', pokemon['249'], 360);
checkSpecial('Lugia', 'Apex', pokemon['249'], 361);
checkSpecial('Ho Oh', 'Apex Shadow', pokemon['250'], 362);
checkSpecial('Ho Oh', 'Apex', pokemon['250'], 363);
result.sort((a, b) => {
    const r = b.dps - a.dps;
    return r === 0 ? b.value - a.value : r;
});
console.log('#\tPokemon\tForm\tAlignment\tLevel\tCP\tQuick\tCharged\tDPS\tTDO');
let i = 0;
for (const row of result) console.log(`${++i}\t${row.pokemon}\t` + (row.form ? row.form : '') +
    `\t${row.shadow ?? ''}\t${row.level}\t${row.cp}\t` +
    (row.quick ? moves[row.quick].name + (row.quickType ? ' ' + types[row.quickType].typeName : '') + (row.quicks ? ` x${-row.quicks}` : '') : '') + `\t` +
    (row.charged ? moves[row.charged].name : '') + `\t${row.dps.toFixed(2)}\t${row.value.toFixed(2)}`);
