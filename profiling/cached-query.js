const POGOProtos = require("pogo-protos");

const Ohbem = require('..');
const pokemonData = require('./cached.json');

const mode = process.argv[process.argv.length - 1];
const ohbem = new Ohbem({
    pokemonData,
    cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
    compactCache: mode === 'compact',
});
for (let counter = parseInt(process.argv[2]) || 1000000; counter; --counter) {
    ohbem.queryPvPRank(POGOProtos.Rpc.HoloPokemonId.BEHEEYEM, 0, 0, 1, 1, 2, 3, 4);
}
