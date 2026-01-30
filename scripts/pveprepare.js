const { generate } = require('../../Pogo-Data-Generator/dist/index.js');
const fs = require("node:fs");
const path = require("node:path");

const pokemonTemplate = {
    attack: true,
    defense: true,
    stamina: true,
    types: {
        typeId: true,
        typeName: false,
    },
    quickMoves: 'moveId',
    chargedMoves: 'moveId',
    eliteQuickMoves: 'moveId',
    eliteChargedMoves: 'moveId',
    purificationDust: true,
    gmaxMove: 'moveId',
};
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
            "includeEstimatedPokemon": {
                "baseStats": true,
                "mega": true,
            },
            includeProtos: true,
        },
        template: {
            pokemonName: true,
            forms: {
                formName: true,
                ...pokemonTemplate,
            },
            tempEvolutions: {
                unreleased: true,
                ...pokemonTemplate,
            },
            unreleased: true,
            ...pokemonTemplate,
        },
    },
    moves: {
        enabled: true,
        options: {
            topLevelName: 'moves',
            keys: {
                keyJoiner: '_',
                main: 'moveId',
                type: false,
            },
            customFields: {
                moveId: 'id',
                moveName: 'name',
            },
            includeProtos: true,
            snake_case: false,
        },
        template: {
            moveId: true,
            moveName: true,
            proto: true,
            type: {
                typeId: true,
                typeName: false,
            },
            power: true,
            durationMs: true,
            energyDelta: true,
        },
    },
    types: {
        enabled: true,
        template: {
            typeId: false,
            typeName: true,
            strengths: {
                typeId: true,
                typeName: false,
            },
            weaknesses: {
                typeId: true,
                typeName: false,
            },
            veryWeakAgainst: {
                typeId: true,
                typeName: false,
            },
            immunes: {
                typeId: true,
                typeName: false,
            },
            weakAgainst: {
                typeId: true,
                typeName: false,
            },
            resistances: {
                typeId: true,
                typeName: false,
            },
        },
    }
};

function addEliteChargedMove(obj, arr) {
    if (obj.eliteChargedMoves) console.warn(`${JSON.stringify(obj)} does not need ${arr}?`); else obj.eliteChargedMoves = arr;
}

(async () => {
    const result = await generate({
        template,
        url: 'https://raw.githubusercontent.com/alexelgt/game_masters/refs/heads/master/GAME_MASTER.json',
    });
    result.pokemon['384'].eliteChargedMoves.push(384);
    addEliteChargedMove(result.pokemon['483'].forms['2829'], [394]);
    addEliteChargedMove(result.pokemon['484'].forms['2830'], [388]);
    result.pokemon['646'].forms['147'].eliteChargedMoves.push(466);
    result.pokemon['646'].forms['148'].eliteChargedMoves.push(467);
    addEliteChargedMove(result.pokemon['647'].forms['150'], [489]);
    addEliteChargedMove(result.pokemon['800'].forms['2718'], [404]);
    addEliteChargedMove(result.pokemon['800'].forms['2719'], [405]);
    addEliteChargedMove(result.pokemon['888'].forms['2576'], [469]);
    addEliteChargedMove(result.pokemon['889'].forms['2578'], [470]);
    fs.writeFileSync(path.join(__dirname, 'pve.json'), JSON.stringify(result));
})();
