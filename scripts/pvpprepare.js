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
            includeEstimatedPokemon: true,
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
            pvpPower: true,
            pvpDurationTurns: true,
            pvpEnergyDelta: true,
            pvpBuffs: {
                attackerAttackStatStageChange: true,
                targetDefenseStatStageChange: true,
                buffActivationChance: true,
            },
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

(async () => {
    fs.writeFileSync(path.join(__dirname, 'pvp.json'), JSON.stringify(await generate({ template })));
})();
