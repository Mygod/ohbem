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

const calculateStatProduct = (stats, attack, defense, stamina, level) => {
    const multiplier = calculateCpMultiplier(level);
    let hp = Math.floor((stamina + stats.stamina) * multiplier);
    if (hp < 10) hp = 10;
    return (attack + stats.attack) * multiplier *
        (defense + stats.defense) * multiplier *
        hp;
};

const calculateCp = (stats, attack, defense, stamina, level) => {
    const multiplier = calculateCpMultiplier(level);

    const a = stats.attack + attack;
    const d = stats.defense + defense;
    const s = stats.stamina + stamina;

    const cp = Math.floor(multiplier * multiplier * a * Math.sqrt(d * s) / 10);
    return cp < 10 ? 10 : cp;
};

const calculatePvPStat = (stats, attack, defense, stamina, cap, lvCap, minLevel = 1) => {
    if (calculateCp(stats, attack, defense, stamina, minLevel) > cap) return null;
    let bestCP = cap, lowest = minLevel, highest = lvCap;
    for (let mid = Math.ceil(lowest + highest) / 2; lowest < highest; mid = Math.ceil(lowest + highest) / 2) {
        const cp = calculateCp(stats, attack, defense, stamina, mid);
        if (cp <= cap) {
            lowest = mid;
            bestCP = cp;
        } else highest = mid - .5;
    }
    return { value: calculateStatProduct(stats, attack, defense, stamina, lowest), level: lowest, cp: bestCP };
};

const calculateRanks = (stats, cpCap, lvCap) => {
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
    sortedRanks.sort((a, b) => b.value - a.value);
    const best = sortedRanks[0].value;
    for (let i = 0, j = 0; i < sortedRanks.length; i++) {
        const entry = sortedRanks[i];
        entry.percentage = Number((entry.value / best).toFixed(5));
        if (entry.value < sortedRanks[j].value) j = i;
        entry.rank = j + 1;
    }
    return { combinations, sortedRanks };
};

const calculateRanksCompact = (stats, cpCap, lvCap) => {
    // note if you are trying to port it to other languages: use a short (2-byte) array to save RAM
    const combinations = Array(16 * 16 * 16);
    const sortedRanks = [];
    for (let a = 0; a <= 15; a++) {
        for (let d = 0; d <= 15; d++) {
            for (let s = 0; s <= 15; s++) {
                const entry = calculatePvPStat(stats, a, d, s, cpCap, lvCap);
                entry.index = (a * 16 + d) * 16 + s;
                sortedRanks.push(entry);
            }
        }
    }
    sortedRanks.sort((a, b) => b.value - a.value);
    for (let i = 0, j = 0; i < sortedRanks.length; i++) {
        const entry = sortedRanks[i];
        if (entry.value < sortedRanks[j].value) j = i;
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
