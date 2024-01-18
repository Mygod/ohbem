export type Leagues = "little" | "great" | "ultra" | "master";

export interface Stats {
    attack: number;
    defense: number;
    stamina: number;
}

export interface PvPStat {
    rank: number;
    attack: number;
    defense: number;
    stamina: number;
    cap: number;
    value: number;
    level: number;
    cp: number;
    percentage?: number;
    capped?: boolean;
    evolution?: number;
    form?: number;
}

export interface RankEntry {
    pokemon: number;
    form?: number;
    evolution?: number;
    cap: number;
    capped?: boolean;
    level: number;
    cp: number;
    value: number;
    percentage: number;
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

export interface LRUCache {
    get(key: string): object;
    set(key: string, value: object): void;
}

export interface OhbemOptions {
    leagues?: Record<string, LeagueOptions | number | null>;
    levelCaps?: number[];
    pokemonData?: PokemonData;
    cachingStrategy?: CachingStrategy;
    removeUnviablePokemon?: boolean;
    rankingComparator?: (a: PvPStat, b: PvPStat) => number;
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

export type PvPQueryResult = Partial<Record<Leagues, PvPStat[]>>;

declare class Ohbem {
    static calculateCpMultiplier: (level: number, test?: boolean) => number;
    static calculateCp: (stats: Stats, attack: number, defense: number, stamina: number, level: number) => number;
    static cachingStrategies: {
        cpuHeavy: null;
        balanced: CachingStrategy;
        memoryHeavy: CachingStrategy;
        lru: (options: object, compactCache: boolean) => CachingStrategy;
    };
    static rankingComparators: {
        default: (a: PvPStat, b: PvPStat) => number;
        preferHigherCp: (a: PvPStat, b: PvPStat) => number;
        preferLowerCp: (a: PvPStat, b: PvPStat) => number;
    };
    static fetchPokemonData(): Promise<PokemonData>;
    static fetchPokemonDataUnstable(): Promise<PokemonData>;
    static filterLevelCaps(entries: PvPStat[], interestedLevelCaps: number[]): RankEntry[];

    constructor(options?: OhbemOptions);

    calculateAllRanks(stats: Stats, cpCap: number): Record<string, RankResult[][][]> | null;
    calculateTopRanks(maxRank: number, pokemonId: number, form?: number, evolution?: number, ivFloor?: number): PvPQueryResult;
    updatePokemonData(pokemonData: PokemonData): void;
    queryPvPRank(pokemonId: number, form: number, costume: number, gender: number, attack: number, defense: number, stamina: number, level: number): PvPQueryResult;
    findBaseStats(pokemonId: number, form?: number, evolution?: number): Pokemon;
}

export = Ohbem;