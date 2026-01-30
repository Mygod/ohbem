const { calculatePvPStat } = require('../pvp-core.js');
const fs = require("node:fs");
const path = require("node:path");

const result = [];

const {pokemon, moves, types} = JSON.parse(fs.readFileSync(path.join(__dirname, 'pve.json'), 'utf8'));

function parseType(i) {
    const name = process.argv[i];
    for (const [typeId, {typeName}] of Object.entries(types)) if (typeName.localeCompare(name, undefined, {sensitivity: 'accent'}) === 0) {
        return parseInt(typeId);
    }
    return null;
}
const typeFilter = parseType(2);
const dynamaxCannonBonus = 100;

function checkStats(pokemon, form, formData, pokemonData) {  // RETURN
    if (!formData.attack && !formData.quickMoves && !formData.eliteQuickMoves && !formData.chargedMoves && !formData.eliteChargedMoves && !formData.types && !formData.gmaxMove) return;
    const addMove = (moveset) => {
        const stats = formData.attack ? formData : pokemonData;
        const entry = calculatePvPStat(stats, 15, 15, 15, 1e8, 50, 50);
        if (!entry) return;
        const row = {...entry, pokemon, form, ...moveset};
        if ((formData.types || pokemonData.types).some((type) => type.typeId === moveset.type)) row.dps *= 1.2;
        row.value *= row.dps / 1000000;
        row.dps *= entry.attack / 100;
        result.push(row);
    };
    if (formData.gmaxMove) {
        const gmaxMove = moves[formData.gmaxMove];
        if ((pokemon === 'Zacian' || pokemon === 'Zamazenta') && (form || '').startsWith('Crowned')) {
            if (typeFilter === null || gmaxMove.type.typeId === typeFilter) addMove({move: formData.gmaxMove, dps: gmaxMove.power, type: gmaxMove.type.typeId});
            return;
        } else if (pokemon === 'Eternatus' && form !== 'Eternamax') {
            if (typeFilter === null || gmaxMove.type.typeId === typeFilter) addMove({move: formData.gmaxMove, dps: gmaxMove.power + dynamaxCannonBonus, type: gmaxMove.type.typeId});
            return;
        }
        if (typeFilter === null || gmaxMove.type.typeId === typeFilter) {
            addMove({move: formData.gmaxMove, dps: gmaxMove.power + dynamaxCannonBonus, type: gmaxMove.type.typeId});
            if (typeFilter !== null) return;
        }
    }
    for (const quickMoveId of (formData.quickMoves || pokemonData.quickMoves).concat(formData.eliteQuickMoves || pokemonData && pokemonData.eliteQuickMoves || [])) {
        if (quickMoveId === 133) return;    // struggle???
        if (typeFilter === null || moves[quickMoveId].type.typeId === typeFilter) {
            addMove({move: quickMoveId, dps: 350 + dynamaxCannonBonus, type: moves[quickMoveId].type.typeId});
            if (typeFilter !== null) return;
        }
    }
}

for (const pokemonData of Object.values(pokemon)) {
    checkStats(pokemonData.pokemonName, null, pokemonData);
    for (const formData of Object.values(pokemonData.forms)) checkStats(pokemonData.pokemonName, formData.formName, formData, pokemonData);
}
result.sort((a, b) => {
    const r = b.dps - a.dps;
    return r === 0 ? b.value - a.value : r;
});
console.log('#\tPokemon\tForm\tLevel\tCP\tMove\tDPS\tTDO');
let i = 0;
for (const row of result) console.log(`${++i}\t${row.pokemon}\t` + (row.form ? row.form : '') +
    `\t${row.level}\t${row.cp}\t` + (row.move ? moves[row.move].name : '') +
    `\t${row.dps.toFixed(2)}\t${row.value.toFixed(2)}`);
