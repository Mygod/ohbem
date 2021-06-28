const POGOProtos = require("pogo-protos");

const Ohbem = require('..');
const pokemonData = require('./cached.json');

const ohbem = new Ohbem({pokemonData});
const stats = ohbem.findBaseStats(POGOProtos.Rpc.HoloPokemonId.BEHEEYEM);
for (let counter = parseInt(process.argv[2]) || 1000; counter; --counter) {
    ohbem.calculateAllRanks(stats, 1500);
}
