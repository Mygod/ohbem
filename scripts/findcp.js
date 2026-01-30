const { generate } = require('pogo-data-generator');
const { calculatePvPStat } = require('../pvp-core.js');

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
            // includeEstimatedPokemon: true,
        },
        template: {
            forms: {
                formName: true,
                attack: true,
                defense: true,
                stamina: true,
            },
            tempEvolutions: {
                attack: true,
                defense: true,
                stamina: true,
                unreleased: true,
            },
            pokemonName: true,
            attack: true,
            defense: true,
            stamina: true,
            unreleased: true,
        },
    },
};
const result = [];
const cpCap = parseInt(process.argv[process.argv.length - 1]) || 1e8;

function checkStats(pokemon, form, evolution, stats) {
    if (!stats.attack) return;
    const entry = calculatePvPStat(stats, 15, 15, 15, cpCap, 55);
    if (!entry || entry.cp !== cpCap || entry.level > 51 && (!evolution || entry.level !== 52 && entry.level !== 55)) return;
    result.push({...entry, pokemon: pokemon.pokemonName, form, evolution});
}

(async function () {
    const response = await generate({ template });
    const {pokemon} = response;
    for (const pokemonData of Object.values(pokemon)) {
        checkStats(pokemonData, 0, 0, pokemonData);
        for (const formData of Object.values(pokemonData.forms)) checkStats(pokemonData, formData.formName, 0, formData);
        for (const [evoId, evoData] of Object.entries(pokemonData.tempEvolutions || {})) checkStats(pokemonData, 0, evoId, evoData);
    }
    result.sort((a, b) => a.level - b.level);
    console.log('#\tPokemon\tForm\tEvolution\tLevel\tCP');
    let i = 0;
    for (const row of result) console.log(`${++i}\t${row.pokemon}\t` + (row.form || '') + '\t' +
        (row.evolution || '') + `\t${row.level}\t${row.cp}`);
})();
