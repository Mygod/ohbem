const { generate } = require('pogo-data-generator');
const { calculateHp } = require('../pvp-core.js');
const fs = require("fs");
const path = require("path");
const Ohbem = require("../index");

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
            height: true,
            weight: true,
            forms: {
                formName: true,
                height: true,
                weight: true,
            },
            tempEvolutions: {
                height: true,
                weight: true,
            },
            evolutions: true,
        },
    },
};

(async function () {
    const response = await generate({ template, pokeApi: true });
    const {pokemon} = response;
    fs.writeFileSync(path.join(__dirname, 'debug.json'), JSON.stringify(pokemon, null, ' '));
    const results = [];
    function checkStats(pokemon, stats) {
        if (!stats.height) return;
        let name = pokemon.pokemonName;
        if (stats.formName) name += '-' + stats.formName;
        results.push({name, score: stats.height * .8 + (stats.weight || pokemon.weight) * .15});
    }
    for (const pokemonData of Object.values(pokemon)) {
        checkStats(pokemonData, pokemonData);
        if (pokemonData.forms) for (const form of Object.values(pokemonData.forms)) {
            if (form.height !== pokemonData.height) checkStats(pokemonData, form);
        }
        if (pokemonData.tempEvolutions) for (const [id, evo] of Object.entries(pokemonData.tempEvolutions)) {
            if (evo.height === pokemonData.height) continue;
            evo.formName = id;
            checkStats(pokemonData, evo);
        }
    }
    results.sort((a, b) => b.score - a.score);
    console.log('#\tPokemon\tScore');
    let i = 0;
    for (const row of results) console.log(`${++i}\t${row.name}\t${row.score.toFixed(2)}`);
})();
