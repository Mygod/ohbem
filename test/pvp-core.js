const assert = require('assert');
const { calculateCpMultiplier, calculateCp, calculateRanks, calculateRanksCompact } = require('../pvp-core.js');
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
        const { pokemon } = await pokemonData;
        assert.strictEqual(calculateCp(pokemon[150], 15, 15, 15, 40), 4178, 'Mewtwo CP');
        assert.strictEqual(calculateCp(pokemon[618], 15, 15, 15, 51), 2474, 'Stunfisk CP');
    });
    it('calculateRanks', async () => {
        const { pokemon } = await pokemonData;
        const getRank = (stats, cpCap, lvCap, a, d, s, compact) => {
            if (compact) return calculateRanksCompact(stats, cpCap, lvCap).combinations[(a * 16 + d) * 16 + s];
            return calculateRanks(stats, cpCap, lvCap).combinations[a][d][s].rank;
        }
        for (const compact of [false, true]) {
            assert.strictEqual(getRank(pokemon[26], 1500, 40, 15, 15, 15, compact), 742,
                `Hundo Raichu rank [${compact}]`);
            assert.strictEqual(getRank(pokemon[351], 1500, 51, 4, 14, 15, compact), 56,
                `Weather boosted Castform rank [${compact}]`);
            assert.strictEqual(getRank(pokemon[660], 1500, 100, 0, 15, 11, compact), 1,
                `Diggersby uncapped rank [${compact}]`);
            assert.strictEqual(getRank(pokemon[663], 2500, 51, 13, 15, 15, compact), 1,
                `Talonflame functionally perfect @15 [${compact}]`);
            assert.strictEqual(getRank(pokemon[663], 2500, 51, 13, 15, 14, compact), 1,
                `Talonflame functionally perfect @14 [${compact}]`);
        }
    });
});
