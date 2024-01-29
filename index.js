'use strict';

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
    static calculateCpMultiplier = calculateCpMultiplier;
    static calculateCp = calculateCp;

    static cachingStrategies = {
        cpuHeavy: null,
        balanced: () => lruBuilder(dayOldCacheOptions, true),
        memoryHeavy: () => lruBuilder(dayOldCacheOptions, false),
        lru: (options, compactCache) => () => lruBuilder(options, compactCache),
    };
    static rankingComparators = {
        default: (a, b) => b.value - a.value || b.attack - a.attack,
        preferHigherCp: (a, b) => b.value - a.value || b.attack - a.attack || b.cp - a.cp,
        preferLowerCp: (a, b) => b.value - a.value || b.attack - a.attack || a.cp - b.cp,
    };

    static async fetchPokemonData() {
        const fetch = require('node-fetch');
        const response = await fetch('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-basics.json');
        const json = await response.json();
        return addPokemonDataHelpers(json);
    }
    static async fetchPokemonDataUnstable() {
        const { generate } = require('pogo-data-generator');
        const template = {
            pokemon: {
                enabled: true,
                options: {
                    keys: {
                        main: "pokedexId",
                        forms: "formId",
                        tempEvolutions: "tempEvoId",
                    },
                    customFields: {
                        evoId: "pokemon",
                        formId: "form",
                    },
                    snake_case: true,
                    includeProtos: true,
                    includeEstimatedPokemon: {
                        baseStats: true,
                        mega: true,
                    },
                },
                template: {
                    forms: {
                        attack: true,
                        defense: true,
                        stamina: true,
                        tempEvolutions: {},
                        evolutions: {
                            evoId: true,
                            formId: true,
                            genderRequirement: true,
                        },
                        little: true,
                        costumeOverrideEvos: "costumeId",
                    },
                    evolutions: {
                        evoId: true,
                        formId: true,
                        genderRequirement: true,
                    },
                    tempEvolutions: {
                        attack: true,
                        defense: true,
                        stamina: true,
                        unreleased: true,
                    },
                    attack: true,
                    defense: true,
                    stamina: true,
                    little: true,
                    costumeOverrideEvos: "costumeId",
                },
            },
            costumes: {
                enabled: true,
                options: {
                    keys: {
                        main: 'id',
                    },
                },
                template: "noEvolve",
            },
        };
        const response = await generate({ template });
        return addPokemonDataHelpers(response);
    }

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
        this._removeUnviablePokemon = options.removeUnviablePokemon ?? true;
        this._pokemonData = options.pokemonData;
        this._rankingComparator = options.rankingComparator || Ohbem.rankingComparators.default;
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
                const { combinations, sortedRanks } = calculateRanksCompact(
                    stats, cpCap, lvCap, this._rankingComparator);
                const result = combinations;
                result.push(sortedRanks[0].value);
                return result;
            } : (lvCap) => calculateRanks(stats, cpCap, lvCap, this._rankingComparator).combinations;
            for (const lvCap of this._levelCaps) {
                if (this._removeUnviablePokemon && calculateCp(stats, 15, 15, 15, lvCap) <= cpCap) continue;   // not viable
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
     * Return ranked list of PVP statistics for a given Pokemon.
     * This calculation does not involve caching.
     *
     * @param maxRank {number} Top<n> ranks.
     * @param pokemonId {number}
     * @param [form] {number}
     * @param [evolution] {number}
     * @param [ivFloor] {number}
     * @returns {{}}
     */
    calculateTopRanks(maxRank, pokemonId, form = 0, evolution = 0, ivFloor = 0) {
        const masterPokemon = this._pokemonData.pokemon[pokemonId];
        const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
        const masterEvolution = evolution ? masterForm.temp_evolutions[evolution] : masterForm;
        const stats = masterEvolution.attack ? masterEvolution : masterForm.attack ? masterForm : masterPokemon;
        const results = {};
        for (const [leagueName, leagueOptions] of Object.entries(this._leagues)) {
            const rankings = [];
            if (leagueOptions !== null) {
                if (leagueOptions.little && !(masterForm.little || masterPokemon.little)) continue;
                const lastRank = [];
                const comparator = this._rankingComparator;
                function processLevelCap(cap, setOnDup = false) {
                    const { combinations, sortedRanks } = calculateRanksCompact(
                        stats, leagueOptions.cap, cap, comparator, ivFloor);
                    for (let i = 0; i < sortedRanks.length; ++i) {
                        const stat = sortedRanks[i];
                        const rank = combinations[stat.index];
                        if (rank > maxRank) {
                            while (lastRank.length > i) lastRank.pop();
                            break;
                        }
                        const attack = (stat.index >> 8) % 16;
                        const defense = (stat.index >> 4) % 16;
                        const stamina = stat.index % 16;
                        const lastStat = lastRank[i];
                        if (lastStat && stat.level === lastStat.level && rank === lastStat.rank &&
                            attack === lastStat.attack && defense === lastStat.defense &&
                            stamina === lastStat.stamina) {
                            if (setOnDup) lastStat.capped = true;
                        } else if (!setOnDup) rankings.push(lastRank[i] = {
                            rank, attack, defense, stamina, cap,
                            value: Math.floor(stat.value),
                            level: stat.level,
                            cp: stat.cp,
                            percentage: Number((stat.value / sortedRanks[0].value).toFixed(5)),
                        });
                    }
                }
                let maxed = false;
                for (const cap of this._levelCaps) {
                    if (this._removeUnviablePokemon && calculateCp(stats, 15, 15, 15, cap) <= leagueOptions.cap) continue;
                    processLevelCap(cap);
                    if (calculateCp(stats, ivFloor, ivFloor, ivFloor, cap + .5) > leagueOptions.cap) {
                        maxed = true;
                        for (const entry of lastRank) entry.capped = true;
                        break;
                    }
                }
                if (rankings.length && !maxed) processLevelCap(maxLevel, true);
            } else for (const cap of this._levelCaps) {
                const maxHp = calculateHp(stats, 15, cap);
                for (let stamina = ivFloor; stamina < 15; ++stamina) {
                    if (calculateHp(stats, stamina, cap) === maxHp) rankings.push({
                        rank: 1,
                        attack: 15,
                        defense: 15,
                        stamina,
                        level: cap,
                        percentage: 1,
                    });
                }
            }
            if (rankings.length) results[leagueName] = rankings;
        }
        return results;
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
     * @param pokemonId {number}
     * @param form {number}
     * @param costume {number} This will be used to check whether it can evolve.
     * @param gender {number}
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
        const masterPokemon = this._pokemonData.pokemon[pokemonId];
        if (!masterPokemon || !masterPokemon.attack) return result;
        const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
        const baseEntry = { pokemon: pokemonId };
        if (form) baseEntry.form = form;
        const pushAllEntries = (stats, evolution = 0) => {
            for (const [leagueName, leagueOptions] of Object.entries(this._leagues)) {
                const entries = [];
                if (leagueOptions !== null) {
                    if (leagueOptions.little && !(masterForm.little || masterPokemon.little)) continue;
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
                            delete entry.attack;
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
            canEvolve = !this._pokemonData.costumes[costume] ||
                masterForm.costume_override_evos && masterForm.costume_override_evos.includes(costume);
        }
        if (canEvolve && masterForm.evolutions) {
            for (const evolution of masterForm.evolutions) {
                switch (evolution.pokemon) {
                    case 106:
                        if (attack < defense || attack < stamina) continue;
                        break;
                    case 107:
                        if (defense < attack || defense < stamina) continue;
                        break;
                    case 237:
                        if (stamina < attack || stamina < defense) continue;
                        break;
                }
                if (evolution.gender_requirement && gender !== evolution.gender_requirement) continue;
                const evolvedRanks = this.queryPvPRank(evolution.pokemon, evolution.form || 0, costume, gender,
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
    findBaseStats(pokemonId, form = 0, evolution = 0) {
        return this._pokemonData.findBaseStats(pokemonId, form, evolution);
    }
}

module.exports = Ohbem;
