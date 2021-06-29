const Ohbem = require('..');
const pokemonData = require('./cached.json');

for (const compatCache of [false, true]) {}
const ohbem = new Ohbem({
    pokemonData,
    cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    compactCache: process.argv[process.argv.length - 1] === 'compact',
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
    for (const form of Object.values(pokemon.forms)) goInCache(form);
}
if (global.gc) global.gc(); // do a gc to show accurate RAM usage
console.log('Finished with', ohbem._rankCache.length, 'entries');
(async () => new Promise(resolve => process.stdin.once('data', resolve)))();
