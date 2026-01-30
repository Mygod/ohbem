const readline = require('readline');
const Ohbem = require('../index.js');
const {calculatePvPStat} = require("../pvp-core");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
});

const ohbem = (async () => {
    const pokemonData = await Ohbem.fetchPokemonData();
    return new Ohbem({
        leagues: {
            little: {cap: 500, little: false},
            great: 1500,
            ultra: 2500,
            master: null,
        },
        levelCaps: [50, 51, 60],
        pokemonData,
    });
})();

// input format: pokemon [form] a/d/s [cp]
rl.on('line', async line => {
    const o = await ohbem;
    const args = line.split(' ').filter(Boolean);
    const pokemon = parseInt(args[0]);
    const hasForm = args.length > 2 && args[2].indexOf('/') >= 0;
    const form = hasForm ? parseInt(args[1]) : 0;
    const iv = args[1 + hasForm].split('/', 3).map(Number);
    let level = parseInt(args[2 + hasForm] ) || 1;
    if (level > 1) {
        const entry = calculatePvPStat(o._pokemonData.findBaseStats(pokemon, form), iv[0], iv[1], iv[2], level, 50);
        if (!entry || entry.cp !== level) {
            console.warn('Failed to find match for that CP:', entry);
            level = 1;
        } else level = entry.level;
    }
    console.log(o.queryPvPRank(pokemon, form, 0, 0, iv[0], iv[1], iv[2], level));
});
