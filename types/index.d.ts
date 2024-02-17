export interface Stats {
    /**
     * Base attack.
     */
    attack: number;
    /**
     * Base defense.
     */
    defense: number;
    /**
     * Base stamina.
     */
    stamina: number;
}

export interface PvPStat {
    attack: number;
    value: number;
    level: number;
    cp: number;
}

export interface TopRankEntry extends PvPStat {
    rank: number;
    defense: number;
    stamina: number;
    cap: number;
    percentage?: number;
    capped?: boolean;
    evolution?: number;
    form?: number;
}

export interface PvPRankEntry {
    pokemon: number;
    level: number;
    rank: number;
    percentage: number;
    form?: number;
    evolution?: number;
    cap?: number;
    capped?: boolean;
    cp?: number;
    value?: number;
}

export interface RankResult {
    value: number;
    level: number;
    cp: number;
    percentage: number;
    rank: number;
}

export interface LeagueOptions {
    cap: number | null;
    little?: boolean;
}

export interface CachingStrategy {
    (): [LRUCache, boolean];
}

export interface RankingComparator {
    (a: PvPStat, b: PvPStat): number;
}

export interface LRUCache {
    get(key: string): object;
    set(key: string, value: object): void;
}

/**
 * An object containing your preferences.
 */
export interface OhbemOptions {
    /**
     * An object containing key-value pair, where keys correspond to league names,
     * and value could either be a Number indicating the CP cap, or a LeagueOptions object,
     * or null indicating functionally perfect.
     * If key starts with "little" and the value is a Number, it will be assumed to be a little cup.
     */
    leagues?: Record<string, LeagueOptions | number | null>;
    /**
     * An array containing a list of Numbers in ascending order, indicating the interested level caps.
     */
    levelCaps?: number[];
    /**
     * An object containing Pokemon data from Masterfile-Generator.
     * This field is required for calling queryPvPRank.
     * @see fetchPokemonData
     * @see queryPvPRank
     */
    pokemonData?: PokemonData;
    /**
     * An optional function constructing a cache implementing get(key) and set(key, value),
     * along with a boolean for whether compact mode (#3) should be used.
     * @see cachingStrategies
     */
    cachingStrategy?: CachingStrategy;
    /**
     * A boolean representing whether Ohbem will remove Pokemon who do not reach league CP cap at Level Cap
     * even with 15/15/15 stats [default: true]
     */
    removeUnviablePokemon?: boolean;
    /**
     * An optional function determining how everything should be ranked.
     * @see rankingComparators.default
     */
    rankingComparator?: RankingComparator;
}

export interface PokemonData {
    pokemon: Record<string, Pokemon>;
    costumes: Record<string, boolean>;
}

export interface Pokemon {
    forms: Record<string, Form>;
    attack: number;
    defense: number;
    stamina: number;
    evolutions?: Evolution[];
    little?: boolean;
    temp_evolutions?: Record<string, PokemonTempEvolution>;
    costume_override_evos?: number[];
}

export interface Evolution {
    pokemon: number;
    form?: number;
    gender_requirement?: number;
}

export interface Form {
    evolutions?: Evolution[];
    temp_evolutions?: Record<string, FormTempEvolution>
    costume_override_evos?: number[];
    attack?: number;
    defense?: number;
    stamina?: number;
    little?: boolean;
}

export interface FormTempEvolution {}

export interface PokemonTempEvolution {
    attack: number;
    defense: number;
    stamina: number;
    unreleased?: boolean;
}

export default class Ohbem {
    /**
     * Calculate CP multiplier, with estimated CPM for L55+.
     */
    static calculateCpMultiplier: (level: number, test?: boolean) => number;

    /**
     * Calculate CP.
     *
     * @param stats {Stats} The base stats.
     * @param attack {number} Attack IV.
     * @param defense {number} Defense IV.
     * @param stamina {number} Stamina IV.
     */
    static calculateCp: (stats: Stats, attack: number, defense: number, stamina: number, level: number) => number;

    static cachingStrategies: {
        /**
         * Rankings will not be cached.
         *
         * Usage: cachingStrategies.cpuHeavy.
         */
        cpuHeavy: null;
        /**
         * Rankings will always be cached for 24 hours. Requires optional dependency lru-cache.
         * Furthermore, the cache will be optimized towards using less RAM.
         *
         * Usage: cachingStrategies.balanced
         */
        balanced: CachingStrategy;
        /**
         * Rankings will always be cached for 24 hours. Requires optional dependency lru-cache.
         * Furthermore, the cache will be optimized towards using less CPU.
         *
         * Usage: cachingStrategies.memoryHeavy
         */
        memoryHeavy: CachingStrategy;
        /**
         * Rankings will be cached by LRUCache. Requires optional dependency lru-cache.
         *
         * Usage: cachingStrategies.lru({...}, true/false)
         *
         * @param options This will be used as the options to create the LRUCache.
         * @param compactCache Whether the cache should be optimized for lower RAM (true) or lower CPU (false).
         */
        lru: (options: any, compactCache: boolean) => CachingStrategy;
    };

    static rankingComparators: {
        /**
         * Rank everything by stat product descending then by attack descending.
         * This is the default behavior, since in general, a higher stat product is usually preferable;
         * and in case of tying stat products, higher attack means that you would be more likely to win CMP ties.
         */
        default: RankingComparator;
        /**
         * In addition to the default rules, also compare by CP descending in the end.
         * While ties are not meaningfully different most of the time,
         * the rationale here is that a higher CP looks more intimidating.
         */
        preferHigherCp: RankingComparator;
        /**
         * In addition to the default rules, also compare by CP ascending in the end.
         * While ties are not meaningfully different most of the time,
         * the rationale here is that you can flex beating your opponent using one with a lower CP.
         */
        preferLowerCp: RankingComparator;
    };

    /**
     * Fetches the latest Pokemon data from Masterfile-Generator. Requires optional dependency node-fetch.
     *
     * @returns See pokemon-data.js for some helper methods.
     * @see addPokemonDataHelpers
     */
    static fetchPokemonData(): Promise<PokemonData>;

    /**
     * Generates and fetches the latest Pokemon data from Pogo Data Generator. Requires optional dependency pogo-data-generator.
     *
     * @returns See pokemon-data.js for some helper methods.
     * @see addPokemonDataHelpers
     */
    static fetchPokemonDataUnstable(): Promise<PokemonData>;

    /**
     * Filter the output of queryPvPRank with a subset of interested level caps.
     *
     * @param entries An array containing PvP combinations for a specific league from the output of queryPvPRank.
     * @param interestedLevelCaps A non-empty array containing a list of interested level caps in ascending order.
     * @returns The filtered array containing only capped entries and those whose cap matches the given caps.
     */
    static filterLevelCaps(entries: PvPRankEntry[], interestedLevelCaps: number[]): PvPRankEntry[];

    /**
     * Initialize your overlord Ohbem.
     */
    constructor(options?: OhbemOptions);

    /**
     * Calculate all PvP ranks for a specific base stats with the specified CP cap.
     *
     * The return value of this method is subject to change. Ask maintainer before attempting to invoke it.
     *
     * @param stats {Stats} An object containing the base stats.
     * @param cpCap {number} The CP cap.
     * @returns An object mapping level cap to combinations (whose content depends on compactCache),
     *  or null if the Pokemon does not hit the cpCap at any level cap.
     */
    calculateAllRanks(stats: Stats, cpCap: number): Record<string, number[] | RankResult[][][]> | null;

    /**
     * Return ranked list of PVP statistics for a given Pokemon.
     * This calculation does not involve caching.
     *
     * @param maxRank {number} Top<n> ranks.
     * @param pokemonId {number}
     * @param [form] {number}
     * @param [evolution] {number}
     * @param [ivFloor] {number}
     */
    calculateTopRanks(maxRank: number, pokemonId: number, form?: number, evolution?: number, ivFloor?: number): Record<string, TopRankEntry[]>;

    /**
     * Update pokemonData with a newer version.
     * @param pokemonData
     */

    updatePokemonData(pokemonData: PokemonData): void;
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
     */
    queryPvPRank(pokemonId: number, form: number, costume: number, gender: number, attack: number, defense: number, stamina: number, level: number): Record<string, PvPRankEntry[]>;

    /**
     * @deprecated
     * @see pokemonData.findBaseStats
     */
    findBaseStats(pokemonId: number, form?: number, evolution?: number): Pokemon;
}
