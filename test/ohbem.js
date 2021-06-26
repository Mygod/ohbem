const assert = require('assert');
const Ohbem = require('../index.js');

describe('Ohbem', () => {
    const ohbemFut = (async () => new Ohbem({
        pokemonData: await Ohbem.fetchPokemonData(),
    }))();
    it('Elgyem', async () => {
        const ohbem = await ohbemFut;
        const out = ohbem.queryPvPRank(605, 0, 0, 1, 1, 4, 12, 7);
        assert.strictEqual(out.little.length, 1, 'Little cup only has one entry');
        assert.strictEqual(out.little[0].pokemon, 605, 'Little cup cannot evolve');
        // TODO: finish tests
    });
});
