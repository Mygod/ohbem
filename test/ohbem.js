const assert = require('assert');
const Ohbem = require('../index.js');

describe('Ohbem', () => {
    const ohbemFut = (async () => {
        const pokemonData = await Ohbem.fetchPokemonData();
        return [false, true].map(compactCache => new Ohbem({
            pokemonData,
            cachingStrategy: () => [null, compactCache],
        }));
    })();
    it('Elgyem and Audino', async () => {
        for (const ohbem of await ohbemFut) {
            let out = ohbem.queryPvPRank(605, 0, 0, 1, 1, 4, 12, 7);
            assert.strictEqual(out.little.length, 1, `Little cup only has one entry [${ohbem._compactCache}]`);
            assert.strictEqual(out.little[0].pokemon, 605, `Little cup cannot evolve [${ohbem._compactCache}]`);
            assert.strictEqual(out.great.length, 3, `GL has 3 entries [${ohbem._compactCache}]`);
            assert.strictEqual(Ohbem.filterLevelCaps(out.great, [50, 51]).length, 3,
                `Useless filtered GL has 3 entries [${ohbem._compactCache}]`);
            assert.strictEqual(Ohbem.filterLevelCaps(out.great, [50]).length, 2,
                `L50 GL has 2 entries [${ohbem._compactCache}]`);
            assert.strictEqual(Ohbem.filterLevelCaps(out.great, [51]).length, 2,
                `L51 GL has 2 entries [${ohbem._compactCache}]`);

            out = ohbem.queryPvPRank(531, 0, 0, 2, 0, 14, 14, 5);
            console.log(out);
            assert.strictEqual(out.little, undefined, `No little cup [${ohbem._compactCache}]`);
            assert.strictEqual(out.great.length, 2, `GL has 2 entries [${ohbem._compactCache}]`);
            assert.strictEqual(out.ultra.length, 1, `UL has 1 entires [${ohbem._compactCache}]`);
            // TODO: finish tests
        }
    });
    it('Functionally Perfect', async () => {
        for (const ohbem of await ohbemFut) {
            const out = ohbem.queryPvPRank(661, 0, 0, 1, 15, 15, 14, 1);
            assert.strictEqual(out.master.length, 3,
                `Talonflame functionally perfect at level 50/51 [${ohbem._compactCache}]`);
            assert.strictEqual(Ohbem.filterLevelCaps(out.master, [50]).length, 1,
                `Talonflame functionally perfect at level 50 [${ohbem._compactCache}]`);
            assert.strictEqual(Ohbem.filterLevelCaps(out.master, [51]).length, 2,
                `Talonflame functionally perfect at level 51 [${ohbem._compactCache}]`);
        }
    });
});
