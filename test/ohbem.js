const assert = require('assert');
const Ohbem = require('../index.js');

describe('Ohbem', () => {
    const ohbemFut = (async () => {
        const pokemonData = await Ohbem.fetchPokemonData();
        return [false, true].map(compactCache => new Ohbem({
            pokemonData,
            compactCache,
        }));
    })();
    it('Elgyem', async () => {
        for (const ohbem of await ohbemFut) {
            const out = ohbem.queryPvPRank(605, 0, 0, 1, 1, 4, 12, 7);
            assert.strictEqual(out.little.length, 1, `Little cup only has one entry [${ohbem._compactCache}]`);
            assert.strictEqual(out.little[0].pokemon, 605, `Little cup cannot evolve [${ohbem._compactCache}]`);
            // TODO: finish tests
        }
    });
    it('Functionally Perfect', async () => {
        for (const ohbem of await ohbemFut) {
            const out = ohbem.queryPvPRank(661, 0, 0, 1, 15, 15, 14, 1);
            assert.strictEqual(out.master.length, 3,
                `Talonflame functionally perfect at level 50/51 [${ohbem._compactCache}]`);
        }
    });
});
