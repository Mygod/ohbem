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
            includeEstimatedPokemon: {
                baseStats: true,
                mega: true,
            },
            includeProtos: true,
            unsetDefaultForm: false,
        },
        template: {
            forms: {
                attack: true,
                defense: true,
                stamina: true,
                formName: true,
            },
            evolutions: {
                evoId: true,
                formId: true,
                genderRequirement: true,
            },
            tempEvolutions: {
                attack: true,
                defense: true,
                stamina: true,
                unreleased: true,
            },
            attack: true,
            defense: true,
            stamina: true,
            unreleased: true,
            pokemonName: true,
        },
    },
};
const result = [];
const cpCap = parseInt(process.argv[process.argv.length - 1]) || 1e8;

let pokemonData;
function attemptMatch(pokemonId, form, gender, attack, defense, stamina, level, cp) {
    const masterPokemon = pokemonData[pokemonId];
    if (!masterPokemon || !masterPokemon.attack) return result;
    const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
    function checkCp(stats, evoId = 0) {
        const stat = calculatePvPStat(stats, attack, defense, stamina, cpCap, 55, level);
        if (!stat || stat.cp !== cpCap) return;
        console.log(level === stat.level ? 'FOUND MATCH' : 'Found match', masterPokemon.pokemonName,
            form ? masterForm.formName : null, evoId, `${attack}/${defense}/${stamina}`, level, '->', stat.level, cp);
    }
    checkCp(masterForm.attack ? masterForm : masterPokemon);
    if (masterForm.evolutions) {
        for (const evolution of masterForm.evolutions) {
            switch (evolution.pokemon) {
                case 106:
                    if (attack < defense || attack < stamina) continue;
                    break;
                case 107:
                    if (defense < attack || defense < stamina) continue;
                    break;
                case 237:
                    if (stamina < attack || stamina < defense) continue;
                    break;
            }
            // TODO:
            // if (evolution.gender_requirement && gender !== evolution.gender_requirement) continue;
            // reset costume since we know it can evolve
            attemptMatch(evolution.pokemon, evolution.form || 0, gender, attack, defense, stamina, level, cp);
        }
    }
    const tempEvolutions = masterForm.tempEvolutions || masterPokemon.tempEvolutions;
    if (tempEvolutions) {
        for (const [tempEvoId, tempEvo] of Object.entries(tempEvolutions)) {
            checkCp(tempEvo.attack ? tempEvo : masterPokemon.tempEvolutions[tempEvoId], parseInt(tempEvoId));
        }
    }
}

(async function () {
    const response = await generate({ template });
    pokemonData = response.pokemon;
    const nameLookup = {};
    for (const [id, pokemon] of Object.entries(pokemonData)) nameLookup[pokemon.pokemonName.toLowerCase()] = id;
    // console.log(nameLookup);
    for await (const line of require('readline').createInterface({
        input: require('fs').createReadStream(__dirname + '/myshiny.txt'),
    })) {
        let [name, cp, a, d, s] = line.split(',');
        const [pokemonName, formName] = name.split(' ');
        const pokemonId = nameLookup[pokemonName.toLowerCase()];
        if (!pokemonId) {
            console.warn('Unrecognized pokemon', line);
            continue;
        }
        const masterPokemon = pokemonData[pokemonId];
        let form = 0;
        if (formName) {
            for (const [id, masterForm] of Object.entries(masterPokemon.forms)) {
                if (masterForm.formName.toLowerCase() === formName.toLowerCase()) {
                    form = id;
                    break;
                }
            }
            if (!form) {
                console.warn('Unrecognized form', line);
                continue;
            }
        }
        if (!((cp = parseInt(cp)) >= 10) || !((a = parseInt(a)) >= 0 && a <= 15) ||
            !((d = parseInt(d)) >= 0 && d <= 15) || !((s = parseInt(s)) >= 0 && s <= 15)) {
            console.warn('Unrecognized line format', line);
            continue;
        }
        const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
        const foundStat = calculatePvPStat(masterForm.attack ? masterForm : masterPokemon, a, d, s, cp, 55);
        if (foundStat && foundStat.cp === cp) attemptMatch(pokemonId, form, 0, a, d, s, foundStat.level, cp);
        else console.warn('Unrecognized cp', line);
    }
})();
