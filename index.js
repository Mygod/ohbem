'use strict';

const POGOProtos = require('pogo-protos');

const {
    calculateCpMultiplier,
    calculateHp,
    calculateCp,
    calculatePvPStat,
    calculateRanks,
    calculateRanksCompact,
} = require('./pvp-core.js');
const addPokemonDataHelpers = require('./pokemon-data.js');

const maxLevel = 100;

function lruBuilder(options, compactCache) {
    const LRU = require('lru-cache');
    return [new LRU(options), compactCache];
}
const dayOldCacheOptions = {
    maxAge: 24 * 60 * 60 * 1000,
    updateAgeOnGet: true,
};

class Ohbem {
    /**
     * Calculate CP multiplier, with estimated CPM for L55+.
     *
     * @param level
     * @returns {number}
     */
    static calculateCpMultiplier = calculateCpMultiplier;
    /**
     * Calculate CP.
     *
     * @param stats {Object} An object containing the base stats.
     * @param stats.attack {number} Base attack.
     * @param stats.defense {number} Base defense.
     * @param stats.stamina {number} Base stamina.
     * @param attack {number} Attack IV.
     * @param defense {number} Defense IV.
     * @param stamina {number} Stamina IV.
     * @param level {number}
     * @returns {number}
     */
    static calculateCp = calculateCp;

    static cachingStrategies = {
        /**
         * Rankings will not be cached.
         *
         * Usage: cachingStrategies.cpuHeavy.
         */
        cpuHeavy: null,
        /**
         * Rankings will always be cached for 24 hours. Requires optional dependency lru-cache.
         * Furthermore, the cache will be optimized towards using less RAM.
         *
         * Usage: cachingStrategies.balanced
         */
        balanced: () => lruBuilder(dayOldCacheOptions, true),
        /**
         * Rankings will always be cached for 24 hours. Requires optional dependency lru-cache.
         * Furthermore, the cache will be optimized towards using less CPU.
         *
         * Usage: cachingStrategies.memoryHeavy
         */
        memoryHeavy: () => lruBuilder(dayOldCacheOptions, false),
        /**
         * Rankings will be cached by LRUCache. Requires optional dependency lru-cache.
         *
         * Usage: cachingStrategies.lru({...}, true/false)
         *
         * @param options This will be used as the options to create the LRUCache.
         * @param compactCache Whether the cache should be optimized for lower RAM (true) or lower CPU (false).
         */
        lru: (options, compactCache) => () => lruBuilder(options, compactCache),
    };

    /**
     * Fetches the latest Pokemon data from Masterfile-Generator. Requires optional dependency axios.
     *
     * @returns {Promise<object>} See pokemon-data.js for some helper methods.
     * @see addPokemonDataHelpers
     */
    static async fetchPokemonData() {
        const fetch = require('node-fetch');
        const response = await fetch('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-basics.json')
            .then(res => res.json());
        return addPokemonDataHelpers(response.pokemon);
    }

    /**
     * Filter the output of queryPvPRank with a subset of interested level caps.
     *
     * @param entries {Object[]}
     *  An array containing PvP combinations for a specific league from the output of queryPvPRank.
     * @param interestedLevelCaps {number[]}
     *  A non-empty array containing a list of interested level caps in ascending order.
     * @returns {Object[]} The filtered array containing only capped entries and those whose cap matches the given caps.
     */
    static filterLevelCaps(entries, interestedLevelCaps) {
        const result = [];
        let last;
        for (const entry of entries) {
            if (entry.cap === undefined) {  // functionally perfect, fast route
                if (interestedLevelCaps.includes(entry.level)) result.push(entry);
                continue;
            }
            if (entry.capped ? interestedLevelCaps[interestedLevelCaps.length - 1] < entry.cap
                             : !interestedLevelCaps.includes(entry.cap)) continue;
            if (last && last.pokemon === entry.pokemon &&
                last.form === entry.form && last.evolution === entry.evolution &&
                // if raising the level cap does not increase its level,
                // this IV has hit the max level in the league;
                // at this point, its rank can only go down (only unmaxed combinations can still go up);
                // if the rank stays the same, all higher ranks are also unchanged
                last.level === entry.level && last.rank === entry.rank) {
                // merge two entries
                last.cap = entry.cap;
                if (entry.capped) last.capped = true;
            } else result.push(last = { ...entry });
        }
        return result;
    }

    /**
     * Initialize your overlord Ohbem.
     *
     * @param {Object} options An object containing your preferences. See more options below.
     * @param {Object} [options.leagues] An object containing key-value pair, where keys correspond to league names,
     *  and value could either be a Number indicating the CP cap, or an Object like {little: true, cap: 500},
     *  or null indicating functionally perfect.
     *  If key starts with "little" and the value is a Number, it will be assumed to be a little cup.
     * @param {Number[]} [options.levelCaps] An array containing a list of Numbers in ascending order,
     *  indicating the interested level caps.
     * @param {Object} [options.pokemonData] An object containing Pokemon data from Masterfile-Generator.
     *  This field is required for calling queryPvPRank.
     *  @see fetchPokemonData
     *  @see queryPvPRank
     * @param {Function} [options.cachingStrategy] An optional function constructing a cache
     *  implementing get(key) and set(key, value), along with a boolean for whether compact mode (#3) should be used.
     *  @see cachingStrategies
     */
    constructor(options = {}) {
        this._leagues = {};
        for (const [name, cap] of Object.entries(options.leagues || {
            little: 500,
            great: 1500,
            ultra: 2500,
            master: null,
        })) this._leagues[name] = cap === null || cap instanceof Object ? cap : {
            cap,
            little: name.startsWith("little"),
        };
        this._levelCaps = options.levelCaps || [50, 51];
        this._pokemonData = options.pokemonData;
        if (options.cachingStrategy) [this._rankCache, this._compactCache] = options.cachingStrategy(); else {
            this._rankCache = null;
            this._compactCache = false;
        }
    }

    /**
     * Calculate all PvP ranks for a specific base stats with the specified CP cap.
     *
     * The return value of this method is subject to change. Ask maintainer before attempting to invoke it.
     *
     * @param stats {Object} An object containing the base stats.
     * @param stats.attack {number} Base attack.
     * @param stats.defense {number} Base defense.
     * @param stats.stamina {number} Base stamina.
     * @param cpCap {number} The CP cap.
     * @returns {[Object]} An object mapping level cap to combinations (whose content depends on compactCache),
     *  or null if the Pokemon does not hit the cpCap at any level cap.
     */
    calculateAllRanks(stats, cpCap) {
        const key = `${stats.attack},${stats.defense},${stats.stamina},${cpCap}`;
        let combinationIndex = this._rankCache ? this._rankCache.get(key) : undefined;
        if (combinationIndex === undefined) {
            combinationIndex = null;
            let maxed = false;
            const calculator = this._compactCache ? (lvCap) => {
                const { combinations, sortedRanks } = calculateRanksCompact(stats, cpCap, lvCap);
                const result = combinations;
                result.push(sortedRanks[0].value);
                return result;
            } : (lvCap) => calculateRanks(stats, cpCap, lvCap).combinations;
            for (const lvCap of this._levelCaps) {
                if (calculateCp(stats, 15, 15, 15, lvCap) <= cpCap) continue;   // not viable
                if (combinationIndex === null) combinationIndex = { [lvCap]: calculator(lvCap) };
                else combinationIndex[lvCap] = calculator(lvCap);
                // check if no more power up is possible: further increasing the cap will not be relevant
                if (calculateCp(stats, 0, 0, 0, lvCap + .5) > cpCap) {
                    maxed = true;
                    break;
                }
            }
            if (combinationIndex !== null && !maxed) combinationIndex[maxLevel] = calculator(maxLevel);
            if (this._rankCache) this._rankCache.set(key, combinationIndex);
        }
        return combinationIndex;
    }

    /**
     * Update pokemonData with a newer version.
     * @param pokemonData
     */
    updatePokemonData(pokemonData) {
        this._pokemonData = pokemonData;
    }

    /**
     * Query all ranks for a specific Pokemon, including its possible evolutions.
     *
     * You need to initialize pokemonData in options to use this!
     *
     * @param pokemonId {POGOProtos.Rpc.HoloPokemonId}
     * @param form {POGOProtos.Rpc.PokemonDisplayProto.Form}
     * @param costume {POGOProtos.Rpc.PokemonDisplayProto.Costume} This will be used to check whether it can evolve.
     * @param gender {POGOProtos.Rpc.PokemonDisplayProto.Gender}
     *  This will be used for checking gender-locked evolutions.
     * @param attack {number} Attack IV.
     * @param defense {number} Defense IV.
     * @param stamina {number} Stamina IV.
     * @param level {number} Level.
     * @returns {{}}
     */
    queryPvPRank(pokemonId, form, costume, gender, attack, defense, stamina, level) {
        if (!((attack = parseInt(attack)) >= 0 && attack <= 15)) throw new RangeError('attack');
        if (!((defense = parseInt(defense)) >= 0 && defense <= 15)) throw new RangeError('defense');
        if (!((stamina = parseInt(stamina)) >= 0 && stamina <= 15)) throw new RangeError('stamina');
        if (!((level = parseFloat(level)) >= 1)) throw new RangeError('level');
        const result = {};
        const masterPokemon = this._pokemonData[pokemonId];
        if (!masterPokemon || !masterPokemon.attack) return result;
        const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
        const baseEntry = { pokemon: pokemonId };
        if (form) baseEntry.form = form;
        const pushAllEntries = (stats, evolution = 0) => {
            for (const [leagueName, leagueOptions] of Object.entries(this._leagues)) {
                const entries = [];
                if (leagueOptions !== null) {
                    if (leagueOptions.little && !(stats.little || masterPokemon.little)) continue;
                    const combinationIndex = this.calculateAllRanks(stats, leagueOptions.cap);
                    if (combinationIndex === null) continue;
                    for (const [lvCap, combinations] of Object.entries(combinationIndex)) {
                        let entry;
                        if (this._compactCache) {
                            const cap = parseFloat(lvCap);
                            const stat = calculatePvPStat(stats, attack, defense, stamina,
                                leagueOptions.cap, cap, level);
                            if (stat === null) continue;
                            entry = {
                                ...baseEntry,
                                cap,
                                ...stat,
                                percentage: Number((stat.value / combinations[4096]).toFixed(5)),
                                rank: combinations[(attack * 16 + defense) * 16 + stamina],
                            };
                        } else {
                            const ivEntry = combinations[attack][defense][stamina];
                            if (level > ivEntry.level) continue;
                            entry = { ...baseEntry, cap: parseFloat(lvCap), ...ivEntry };
                        }
                        if (evolution) entry.evolution = evolution;
                        entry.value = Math.floor(entry.value);
                        entries.push(entry);
                    }
                    if (entries.length === 0) continue;
                    let last = entries[entries.length - 1];
                    while (entries.length >= 2) {   // remove duplicate ranks at highest caps
                        const secondLast = entries[entries.length - 2];
                        if (secondLast.level !== last.level || secondLast.rank !== last.rank) break;
                        entries.pop();
                        last = secondLast;
                    }
                    if (last.cap < maxLevel) last.capped = true; else {
                        if (entries.length === 1) continue;
                        entries.pop();
                    }
                } else if (!evolution && attack === 15 && defense === 15 && stamina < 15) {
                    // Temporary evolutions always preserve HP
                    for (const lvCap of this._levelCaps) {
                        if (calculateHp(stats, stamina, lvCap) === calculateHp(stats, 15, lvCap)) {
                            entries.push({ ...baseEntry, level: parseFloat(lvCap), rank: 1, percentage: 1 });
                        }
                    }
                    if (entries.length === 0) continue;
                } else continue;
                result[leagueName] = result[leagueName] ? result[leagueName].concat(entries) : entries;
            }
        };
        pushAllEntries(masterForm.attack ? masterForm : masterPokemon);
        let canEvolve = true;
        if (costume) {
            const costumeName = POGOProtos.Rpc.PokemonDisplayProto.Costume[costume];
            canEvolve = !costumeName.endsWith('_NOEVOLVE') && !costumeName.endsWith('_NO_EVOLVE');
        }
        if (canEvolve && masterForm.evolutions) {
            for (const evolution of masterForm.evolutions) {
                switch (evolution.pokemon) {
                    case POGOProtos.Rpc.HoloPokemonId.HITMONLEE:
                        if (attack < defense || attack < stamina) continue;
                        break;
                    case POGOProtos.Rpc.HoloPokemonId.HITMONCHAN:
                        if (defense < attack || defense < stamina) continue;
                        break;
                    case POGOProtos.Rpc.HoloPokemonId.HITMONTOP:
                        if (stamina < attack || stamina < defense) continue;
                        break;
                }
                if (evolution.gender_requirement && gender !== evolution.gender_requirement) continue;
                // reset costume since we know it can evolve
                const evolvedRanks = this.queryPvPRank(evolution.pokemon, evolution.form || 0, 0, gender,
                    attack, defense, stamina, level);
                for (const [leagueName, results] of Object.entries(evolvedRanks)) {
                    result[leagueName] = result[leagueName] ? result[leagueName].concat(results) : results;
                }
            }
        }
        if (masterForm.temp_evolutions) {
            for (const [tempEvoId, tempEvo] of Object.entries(masterForm.temp_evolutions)) {
                pushAllEntries(tempEvo.attack ? tempEvo : masterPokemon.temp_evolutions[tempEvoId],
                    parseInt(tempEvoId));
            }
        }
        return result;
    }

    /**
     * @deprecated
     * @see pokemonData.findBaseStats
     */
    findBaseStats(pokemonId, form = POGOProtos.Rpc.PokemonDisplayProto.Form.FORM_UNSET) {
        return this._pokemonData.findBaseStats(pokemonId, form);
    }
}

module.exports = Ohbem;
