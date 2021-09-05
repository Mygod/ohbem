const assert = require('assert');
const Ohbem = require('../index.js');

describe('Ohbem', () => {
    const pokemonDataFut = (latest) => latest ? Ohbem.fetchLatestPokemonData() : Ohbem.fetchPokemonData();
    for (const latest of [true, false]) {
        for (const [compactCache, ohbemFut] of [false, true].map(compactCache => [compactCache, (async () => new Ohbem({
            pokemonData: await pokemonDataFut(latest),
            cachingStrategy: () => [null, compactCache],
        }))()])) {
            const ohbemTest = (name, fn) => it(`${name} [${compactCache}]`, async () => fn(await ohbemFut));
            ohbemTest('Numel', (ohbem) => {
                const out = ohbem.queryPvPRank(322, 0, 0, 2, 13, 15, 15, 27);
                assert.strictEqual(out.little, undefined, 'No little cup');
                assert.strictEqual(out.great, undefined, 'No great league');
                assert.strictEqual(out.ultra.length, 2, 'UL has 2 entires');
            });
            ohbemTest('Audino', (ohbem) => {
                const out = ohbem.queryPvPRank(531, 0, 0, 2, 0, 14, 14, 5);
                assert.strictEqual(out.little, undefined, 'No little cup');
                assert.strictEqual(out.great.length, 2, 'GL has 2 entries');
                assert.strictEqual(out.ultra.length, 1, 'UL has 1 entires');
            });
            ohbemTest('Ducklett', (ohbem) => {
                const out = ohbem.queryPvPRank(580, 0, 0, 2, 0, 15, 15, 24);
                assert.strictEqual(out.little.length, 1, 'LC has 1 entries');
                assert.strictEqual(out.little[0].cp, 498, 'Correct CP when level given is exact');
                assert.strictEqual(out.great.length, 1, 'GL has 1 entries');
                assert.strictEqual(out.ultra, undefined, 'UL has no entires');
            });
            ohbemTest('Elgyem', (ohbem) => {
                const out = ohbem.queryPvPRank(605, 0, 0, 1, 1, 4, 12, 7);
                assert.strictEqual(out.little.length, 1, 'Little cup only has one entry');
                assert.strictEqual(out.little[0].pokemon, 605, 'Little cup cannot evolve');
                assert.strictEqual(out.great.length, 3, 'GL has 3 entries');
                assert.strictEqual(Ohbem.filterLevelCaps(out.great, [50, 51]).length, 3,
                    'Useless filtered GL has 3 entries');
                assert.strictEqual(Ohbem.filterLevelCaps(out.great, [50]).length, 2, 'L50 GL has 2 entries');
                assert.strictEqual(Ohbem.filterLevelCaps(out.great, [51]).length, 2, 'L51 GL has 2 entries');
            });
            // TODO: finish tests
            ohbemTest('Functionally Perfect', (ohbem) => {
                const out = ohbem.queryPvPRank(661, 0, 0, 1, 15, 15, 14, 1);
                assert.strictEqual(out.master.length, 3, 'Talonflame functionally perfect at level 50/51');
                assert.strictEqual(Ohbem.filterLevelCaps(out.master, [50]).length, 1,
                    'Talonflame functionally perfect at level 50');
                assert.strictEqual(Ohbem.filterLevelCaps(out.master, [51]).length, 2,
                    'Talonflame functionally perfect at level 51');
            });
        };    
    };
});
