const assert = require('assert');
const { calculateCpMultiplier, calculateCp, calculateRanks } = require('../pvp-core.js');
const Ohbem = require('../index.js');
const cpMultipliers = require('../cpm.json');

describe('PvP Core', () => {
    it('calculateCpMultiplier', () => {
        for (const [key, value] of Object.entries(cpMultipliers)) {
            const level = parseFloat(key);
            if (level < 40) {
                continue;
            }
            // predicted CP multiplier must be consistent for L40+
            assert.strictEqual(calculateCpMultiplier(level, true).toFixed(13), value.toFixed(13), 'CP multiplier at level ' + level);
        }
    });
    const pokemonData = Ohbem.fetchPokemonData();
    it('calculateCP', async () => {
        const pokemon = await pokemonData;
        assert.strictEqual(calculateCp(pokemon[150], 15, 15, 15, 40), 4178, 'Mewtwo CP');
        assert.strictEqual(calculateCp(pokemon[618], 15, 15, 15, 51), 2474, 'Stunfisk CP');
    });
    it('calculateRanks', async () => {
        const pokemon = await pokemonData;
        assert.strictEqual(calculateRanks(pokemon[26], 1500, 40).combinations[15][15][15].rank, 742, 'Hundo Raichu rank');
        assert.strictEqual(calculateRanks(pokemon[351], 1500, 51).combinations[4][14][15].rank, 56, 'Weather boosted Castform rank');
        assert.strictEqual(calculateRanks(pokemon[660], 1500, 100).combinations[0][15][11].rank, 1, 'Diggersby uncapped rank');
        assert.strictEqual(calculateRanks(pokemon[663], 2500, 51).combinations[13][15][15].rank, 1, 'Talonflame functionally perfect @15');
        assert.strictEqual(calculateRanks(pokemon[663], 2500, 51).combinations[13][15][14].rank, 1, 'Talonflame functionally perfect @14');
    });
});
