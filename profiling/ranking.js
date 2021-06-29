const POGOProtos = require("pogo-protos");

const Ohbem = require('..');
const addPokemonDataHelpers = require('../pokemon-data.js')
const pokemonData = addPokemonDataHelpers(require('./cached.json'));

const ohbem = new Ohbem({pokemonData});
const stats = pokemonData.findBaseStats(POGOProtos.Rpc.HoloPokemonId.BEHEEYEM);
for (let counter = parseInt(process.argv[2]) || 1000; counter; --counter) {
    ohbem.calculateAllRanks(stats, 1500);
}
