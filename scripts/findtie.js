const {calculateCp, calculateRanks} = require('../pvp-core');
const pokemonData = require('../profiling/cached.json');

function findTie(pokemon, form, evolution, stats, cpCap) {
    const lvCap = 50;
    if (calculateCp(stats, 15, 15, 15, lvCap) <= cpCap) return; // not viable
    const {sortedRanks} = calculateRanks(stats, cpCap, lvCap);
    for (let i = 0; i < 3; ++i) {
        if (sortedRanks[i].value === sortedRanks[i + 1].value && sortedRanks[i].attack !== sortedRanks[i + 1].attack) {
            console.log(pokemon, form, evolution, cpCap, lvCap, i + 1, sortedRanks[i], sortedRanks[i + 1]);
        }
    }
}

function work(pokemon, form, stats) {
    findTie(pokemon, form, 0, stats, 1500);
    findTie(pokemon, form, 0, stats, 2500);
    if (stats.little) findTie(pokemon, form, 0, stats, 500); else {
        if (stats.temp_evolutions) for (const [e, evolution] of Object.entries(stats.temp_evolutions)) {
            if (evolution.attack) {
                findTie(pokemon, form, e, evolution, 1500);
                findTie(pokemon, form, e, evolution, 2500);
            }
        }
    }
}

for (const [p, pokemon] of Object.entries(pokemonData.pokemon)) {
    work(p, 0, pokemon);
    for (const [f, form] of Object.entries(pokemon.forms || {})) if (form.attack) work(p, f, form);
}
