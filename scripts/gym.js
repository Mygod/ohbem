const { generate } = require('pogo-data-generator');
const { calculateCpMultiplier, calculatePvPStat } = require('../pvp-core.js');

const template = {
    pokemon: {
        enabled: true,
        options: {
            keys: {
                main: "pokedexId",
                forms: "formId",
                tempEvolutions: "tempEvoId",
            },
            customFields: {
                evoId: "pokemon",
                formId: "form",
            },
            includeEstimatedPokemon: true,
            includeProtos: true,
        },
        template: {
            pokemonName: true,
            forms: {
                formName: true,
                attack: true,
                defense: true,
                stamina: true,
            },
            attack: true,
            defense: true,
            stamina: true,
            gymDefenderEligible: true,
            unreleased: true,
        },
    },
};
const cache = {};
const result = [];
const cpCap = parseInt(process.argv[process.argv.length - 1]) || 1e8;

function checkStats(pokemon, form, stats) {
    if (!stats.attack) return;
    const key = `${stats.attack},${stats.defense},${stats.stamina}`;
    let value = cache[key];
    if (value === undefined) {
        let bestEntries = [];
        for (let d = 0; d <= 15; d++) {
            for (let s = 0; s <= 15; s++) {
                const entry = calculatePvPStat(stats, 0, d, s, cpCap, 50);
                if (!entry) continue;
                const multiplier = calculateCpMultiplier(entry.level);
                entry.attack = stats.attack * multiplier;
                entry.bulk = (d + stats.defense) * multiplier *
                    Math.max(10, Math.floor((s + stats.stamina) * multiplier));
                if (bestEntries.length > 0) {
                    if (entry.bulk < bestEntries[0].bulk) continue;
                    if (entry.bulk > bestEntries[0].bulk) bestEntries = [];
                }
                entry.iv = `0/${d}/${s}`;
                bestEntries.push(entry);
            }
        }
        cache[key] = value = bestEntries;
    }
    for (const entry of value) result.push({...entry, pokemon, form});
}

(async function () {
    const response = await generate({ template });
    const {pokemon} = response;
    for (const pokemonData of Object.values(pokemon)) {
        if (!pokemonData.gymDefenderEligible) continue;
        checkStats(pokemonData.pokemonName, null, pokemonData);
        for (const formData of Object.values(pokemonData.forms)) checkStats(pokemonData.pokemonName, formData.formName, formData);
    }
    result.sort((a, b) => {
        const r = b.bulk - a.bulk;
        return r === 0 ? a.attack - b.attack : r;
    });
    console.log('#\tPokemon\tForm\tIV\tLevel\tCP\tBulk\tAttack');
    let i = 0;
    for (const row of result) console.log(`${++i}\t${row.pokemon}\t` + (row.form ? row.form : '') +
        `\t${row.iv}\t${row.level}\t${row.cp}\t${row.bulk.toFixed(0)}\t${row.attack.toFixed(2)}`);
})();
