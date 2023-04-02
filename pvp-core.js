'use strict';

const cpMultipliers = require('./cpm.json');

const calculateCpMultiplier = (level, test = false) => {
    if (test ? level < 40 : level <= 55) return cpMultipliers[level];
    const baseLevel = Math.floor(level);
    const baseCpm = Math.fround(0.5903 + baseLevel * 0.005);
    if (baseLevel === level) return Math.fround(baseCpm);
    const nextCpm = Math.fround(0.5903 + (baseLevel + 1) * 0.005);
    return Math.sqrt((baseCpm * baseCpm + nextCpm * nextCpm) / 2);
};

const calculateHp = (stats, iv, level) => Math.max(10, Math.floor((stats.stamina + iv) * calculateCpMultiplier(level)));

const calculateCp = (stats, attack, defense, stamina, level) => {
    const multiplier = calculateCpMultiplier(level);

    const a = stats.attack + attack;
    const d = stats.defense + defense;
    const s = stats.stamina + stamina;

    const cp = Math.floor(multiplier * multiplier * a * Math.sqrt(d * s) / 10);
    return cp < 10 ? 10 : cp;
};

const calculatePvPStat = (stats, attack, defense, stamina, cap, lvCap, minLevel = 1) => {
    let bestCP = calculateCp(stats, attack, defense, stamina, minLevel);
    if (bestCP > cap) return null;
    let lowest = minLevel, highest = lvCap;
    for (let mid = Math.ceil(lowest + highest) / 2; lowest < highest; mid = Math.ceil(lowest + highest) / 2) {
        const cp = calculateCp(stats, attack, defense, stamina, mid);
        if (cp <= cap) {
            lowest = mid;
            bestCP = cp;
        } else highest = mid - .5;
    }
    const multiplier = calculateCpMultiplier(lowest);
    const atk = (attack + stats.attack) * multiplier;
    let hp = (stamina + stats.stamina) * multiplier;
    hp = hp < 10 ? 10 : Math.floor(hp);
    return { attack: atk, value: atk * (defense + stats.defense) * multiplier * hp, level: lowest, cp: bestCP };
};

const defaultComparator = (a, b) => b.value - a.value || b.attack - a.attack;

const calculateRanks = (stats, cpCap, lvCap, comparator = defaultComparator) => {
    const combinations = [];
    const sortedRanks = [];
    for (let a = 0; a <= 15; a++) {
        const arrA = [];
        for (let d = 0; d <= 15; d++) {
            const arrD = [];
            for (let s = 0; s <= 15; s++) {
                const currentStat = calculatePvPStat(stats, a, d, s, cpCap, lvCap);
                arrD.push(currentStat);
                sortedRanks.push(currentStat);
            }
            arrA.push(arrD);
        }
        combinations.push(arrA);
    }
    sortedRanks.sort(comparator);
    const best = sortedRanks[0].value;
    for (let i = 0, j = 0; i < sortedRanks.length; i++) {
        const entry = sortedRanks[i];
        entry.percentage = Number((entry.value / best).toFixed(5));
        if (comparator(sortedRanks[j], entry) < 0) j = i;
        entry.rank = j + 1;
    }
    for (const entry of sortedRanks) delete entry.attack;
    return { combinations, sortedRanks };
};

const calculateRanksCompact = (stats, cpCap, lvCap, comparator = defaultComparator, ivFloor = 0) => {
    // note if you are trying to port it to other languages: use a short (2-byte) array to save RAM
    const combinations = Array(16 * 16 * 16);
    const sortedRanks = [];
    for (let a = ivFloor; a <= 15; a++) {
        for (let d = ivFloor; d <= 15; d++) {
            for (let s = ivFloor; s <= 15; s++) {
                const entry = calculatePvPStat(stats, a, d, s, cpCap, lvCap);
                entry.index = (a * 16 + d) * 16 + s;
                sortedRanks.push(entry);
            }
        }
    }
    sortedRanks.sort((a, b) => comparator(a, b) || a.index - b.index);  // enforce sort stability
    for (let i = 0, j = 0; i < sortedRanks.length; i++) {
        const entry = sortedRanks[i];
        if (comparator(sortedRanks[j], entry) < 0) j = i;
        combinations[entry.index] = j + 1;
    }
    return { combinations, sortedRanks };
}

module.exports = {
    calculateCpMultiplier,
    calculateHp,
    calculateCp,
    calculatePvPStat,
    calculateRanks,
    calculateRanksCompact,
};
