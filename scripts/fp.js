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
    function work(lva, lvb, bold) {
        const fp50 = [], fp51 = [], fpBoth = [];

        function checkStats(pokemon, stats) {
            if (!stats.attack) return;
            const test50 = calculateHp(stats, 14, lva) === calculateHp(stats, 15, lva);
            const test51 = calculateHp(stats, 14, lvb) === calculateHp(stats, 15, lvb);
            if (!test50 && !test51) return;
            let name = pokemon.pokemonName;
            const shouldBold = bold && ((pokemon.legendary || pokemon.mythic || pokemon.ultraBeast) && !stats.evolutions || bold.has(name));
            if (stats.formName) name += '-' + stats.formName;
            (test50 ? test51 ? fpBoth : fp50 : fp51).push(shouldBold ? `**${name}**` : name);
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
        console.log(`# Functionally perfect at Lv${lva}\n` + fp50.join(', '));
        console.log(`\n# Functionally perfect at Lv${lvb}\n` + fp51.join(', '));
        console.log(`\n# Functionally perfect at Lv${lva}/${lvb}\n` + fpBoth.join(', '));
    }
    work(50, 51, new Set((
        'Gengar,Snorlax,Feraligatr,Walrein,Staraptor,Togekiss,Mamoswine,Porygon Z,Gigalith,Excadrill,Audino,Chandelure,Mandibuzz,Hydreigon,Volcarona,Reuniclus,Annihilape,' +
        'Ditto,Tyranitar,Swampert,Honchkrow,Rhyperior,Rillaboom,' +
        'Charizard,Golurk,Florges,Slitherwing,Sandyshocks,Ironbundle,Wochien,Screamtail,Brutebonnet,Ironthorns,Ironvaliant,Koraidon,Miraidon,Walking-wake'
    ).split(',')));
})();
