const Ohbem = require('..');
const pokemonData = require('./cached.json');

const mode = process.argv[process.argv.length - 1];
const ohbem = new Ohbem({
    pokemonData,
    cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    compactCache: mode === 'compact',
});

function goInCache(stats) {
    ohbem.calculateAllRanks(stats, 1500);
    ohbem.calculateAllRanks(stats, 2500);
    if (stats.little) ohbem.calculateAllRanks(stats, 500); else {
        if (stats.temp_evolutions) for (const evolution of Object.entries(stats.temp_evolutions)) {
            if (evolution.attack) goInCache(evolution);
        }
    }
}

for (const pokemon of Object.values(pokemonData)) {
    goInCache(pokemon);
    for (const form of Object.values(pokemon.forms)) if (form.attack) goInCache(form);
    if (mode === 'baseline') break;
}
if (global.gc) global.gc(); // do a gc to show accurate RAM usage
console.log('Finished with', ohbem._rankCache.length, 'entries');
(async () => new Promise(resolve => process.stdin.once('data', resolve)))();
