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
            attack: true,
            defense: true,
            stamina: true,
            forms: {
                formName: true,
                attack: true,
                defense: true,
                stamina: true,
                tempEvolutions: {},
            },
            tempEvolutions: {
                attack: true,
                defense: true,
                stamina: true,
            },
            legendary: true,
            mythic: true,
            ultraBeast: true,
            evolutions: true,
        },
    },
};

(async function () {
    const response = await generate({ template, pokeApi: true });
    const {pokemon} = response;
    // fs.writeFileSync(path.join(__dirname, 'debug.json'), JSON.stringify(pokemon, null, ' '));
    const hasTempEvolutions = (stats) => !!(stats.tempEvolutions && Object.keys(stats.tempEvolutions).length);

    function work(lva, lvb, bold, eligible = () => true, titleSuffix = '') {
        const fpA = [], fpB = [], fpBoth = [];

        function checkStats(pokemon, stats) {
            if (!stats.attack || !eligible(pokemon, stats)) return;
            const test50 = calculateHp(stats, 14, lva) === calculateHp(stats, 15, lva);
            const test51 = calculateHp(stats, 14, lvb) === calculateHp(stats, 15, lvb);
            if (!test50 && !test51) return;
            let name = pokemon.pokemonName;
            const shouldBold = bold && ((pokemon.legendary || pokemon.mythic || pokemon.ultraBeast) && !stats.evolutions || bold.has(name));
            if (stats.formName) name += '-' + stats.formName;
            (test50 ? test51 ? fpBoth : fpA : fpB).push(shouldBold ? `**${name}**` : name);
        }

        for (const pokemonData of Object.values(pokemon)) {
            checkStats(pokemonData, pokemonData);
            if (pokemonData.forms) for (const form of Object.values(pokemonData.forms)) {
                checkStats(pokemonData, form);
            }
            // if (pokemonData.tempEvolutions) for (const [id, evo] of Object.entries(pokemonData.tempEvolutions)) {
            //     if (evo.stamina === pokemonData.stamina) continue;
            //     evo.formName = id;
            //     checkStats(pokemonData, evo);
            // }
        }
        console.log(`# Functionally perfect at Lv${lva}${titleSuffix}\n` + fpA.join(', '));
        console.log(`\n# Functionally perfect at Lv${lvb}${titleSuffix}\n` + fpB.join(', '));
        console.log(`\n# Functionally perfect at Lv${lva}/${lvb}${titleSuffix}\n` + fpBoth.join(', '));
    }
    const bold = new Set((
        'Gengar,Snorlax,Feraligatr,Walrein,Staraptor,Togekiss,Mamoswine,Porygon Z,Gigalith,Excadrill,Audino,Chandelure,Mandibuzz,Hydreigon,Volcarona,Reuniclus,Annihilape,' +
        'Ditto,Tyranitar,Swampert,Honchkrow,Rhyperior,Rillaboom,' +
        'Charizard,Golurk,Florges,Slitherwing,Sandyshocks,Ironbundle,Wochien,Screamtail,Brutebonnet,Ironthorns,Ironvaliant,Koraidon,Miraidon,Walking-wake'
    ).split(','));
    work(50, 51, bold);
    work(52, 53, bold,
        (pokemonData, stats) => hasTempEvolutions(stats === pokemonData ? pokemonData : stats),
        ' (Mega eligible)');
})();
