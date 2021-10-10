# Ohbem

Ohbem is an optimized judgemental library that computes PvP rankings for Pokemon GO.

Features:

* Little cup/great league/ultra league rankings
* Multiple level caps (level 50/51)
* Customizable CP/level caps
* Evolutions support
* Mega evolutions support (including unreleased Mega)
* Tyrogue evolutions support
* Gender-locked evolutions support
* Unevolvable costumes support
* Tied PvP ranks
  (for example, 13/15/14 and 13/15/15 Talonflame are both UL rank 1 at L51, followed by 14/14/14 being UL rank 3)
* Functionally perfect support
* Optional built-in caching


## Usage

Install it with `npm`.

```sh
npm install ohbem

# Optional dependencies:
# if you want to use the built in data fetcher to fetch from a known-safe/stable masterfile repo
npm install --save node-fetch
# if you want to generate fetch the latest masterfile from Pogo Data Generator (alternative to the option above)
npm install --save pogo-data-generator
# if you want to use cachingStrategy other than cpuHeavy
npm install --save lru-cache
```

Ohbem in action:

```js
const Ohbem = require('ohbem');

// if you want to use built-in fetcher to grab the latest stable pokemon data
const pokemonData = await Ohbem.fetchPokemonData();
// if you want to install pogo-data-generator and use built-in fetcher
// const pokemonData = await Ohbem.fetchPokemonDataUnstable();

// construct an Ohbem -- you should reuse this object as much as possible since it holds a cache
const ohbem = new Ohbem({
    // all of the following options are optional and these (except for pokemonData) are the default values
    // read the documentation for more information
    leagues: {
        little: 500,
        great: 1500,
        // alternative format
        ultra: {
            little: false,
            cap: 2500,
        },
        // only detect functionally perfect IVs; caching does not apply
        master: null,
    },
    levelCaps: [50, 51],
    // The following field is required to use queryPvPRank
    // You can skip populating it if you only want to use other helper methods
    // Requires costume information
    pokemonData,
    // If you have installed lru-cache, uncomment the following to use caching:
    // cachingStrategy: Ohbem.cachingStrategies.balanced,
});
ohbem.queryPvPRank(
    /* pokemonId: */    605,
    /* form: */         0,
    /* costume: */      0,
    /* gender: */       1,
    /* attack: */       1,
    /* defense: */      4,
    /* stamina: */      12,
    /* level: */        7,
);
```

This produces the following output:

```js
{
  little: [
    { pokemon: 605, cap: 50, value: 320801, level: 14.5, cp: 494, percentage: 0.95123, rank: 548, capped: true }
  ],
  great: [
    { pokemon: 605, cap: 50, value: 1444316, level: 50, cp: 1348, percentage: 0.84457, rank: 3158 },
    { pokemon: 605, cap: 51, value: 1472627, level: 51, cp: 1364, percentage: 0.85568, rank: 3128 },
    { pokemon: 606, cap: 50, value: 1630080, level: 20, cp: 1483, percentage: 0.97364, rank: 384, capped: true }
  ],
  ultra: [
    { pokemon: 606, cap: 50, value: 3530858, level: 37, cp: 2484, percentage: 0.97604, rank: 512, capped: true }
  ]
}
```

Sample output detecting functionally perfect Talonflame:
```js
ohbem.queryPvPRank(661, 0, 0, 1, 15, 15, 14, 1);
{
  little: [
    { pokemon: 661, cap: 50, value: 348805, level: 21.5, cp: 490, percentage: 0.89401, rank: 3287, capped: true }
  ],
  great: [
    { pokemon: 662, cap: 50, value: 1743985, level: 41.5, cp: 1493, percentage: 0.94736, rank: 1087 },
    { pokemon: 662, cap: 51, value: 1743985, level: 41.5, cp: 1493, percentage: 0.94736, rank: 1328 },
    { pokemon: 663, cap: 50, value: 1756548, level: 23.5, cp: 1476, percentage: 0.94144, rank: 2867, capped: true }
  ],
  ultra: [
    { pokemon: 663, cap: 51, value: 3851769, level: 50, cp: 2486, percentage: 0.99275, rank: 21 }
  ],
  master: [
    { pokemon: 661, level: 51, rank: 1, percentage: 1 },
    { pokemon: 663, level: 50, rank: 1, percentage: 1 },
    { pokemon: 663, level: 51, rank: 1, percentage: 1 }
  ]
}
```

Sample output showing top 5 ranked Elgyem:
```js
ohbem.calculateTopRanks(5, 605);
{
  little: [
    { rank: 1, attack: 0, defense: 14, stamina: 15, cap: 50, value: 337248, level: 14, cp: 500, percentage: 1, capped: true },
    { rank: 2, attack: 0, defense: 15, stamina: 13, cap: 50, value: 335954, level: 14, cp: 500, percentage: 0.99616, capped: true },
    { rank: 3, attack: 0, defense: 13, stamina: 15, cap: 50, value: 334290, level: 14, cp: 498, percentage: 0.99123, capped: true },
    { rank: 4, attack: 1, defense: 15, stamina: 11, cap: 50, value: 333943, level: 14, cp: 500, percentage: 0.9902, capped: true },
    { rank: 5, attack: 1, defense: 12, stamina: 15, cap: 50, value: 333571, level: 14, cp: 499, percentage: 0.98909, capped: true }
  ],
  great: [
    { rank: 1, attack: 8, defense: 15, stamina: 15, cap: 50, value: 1710113, level: 50, cp: 1498, percentage: 1 },
    { rank: 2, attack: 11, defense: 15, stamina: 15, cap: 50, value: 1699358, level: 48.5, cp: 1500, percentage: 0.99371 },
    { rank: 3, attack: 7, defense: 15, stamina: 15, cap: 50, value: 1699151, level: 50, cp: 1489, percentage: 0.99359 },
    { rank: 4, attack: 10, defense: 15, stamina: 15, cap: 50, value: 1698809, level: 49, cp: 1500, percentage: 0.99339 },
    { rank: 5, attack: 9, defense: 15, stamina: 14, cap: 50, value: 1698192, level: 49.5, cp: 1494, percentage: 0.99303 },
    { rank: 5, attack: 9, defense: 15, stamina: 15, cap: 50, value: 1698192, level: 49.5, cp: 1499, percentage: 0.99303 },
    { rank: 1, attack: 6, defense: 15, stamina: 15, cap: 51, value: 1720993, level: 51, cp: 1497, percentage: 1 },
    { rank: 2, attack: 7, defense: 14, stamina: 15, cap: 51, value: 1717106, level: 51, cp: 1500, percentage: 0.99774 },
    { rank: 3, attack: 8, defense: 15, stamina: 15, cap: 51, value: 1710113, level: 50, cp: 1498, percentage: 0.99368 },
    { rank: 4, attack: 5, defense: 15, stamina: 15, cap: 51, value: 1709818, level: 51, cp: 1487, percentage: 0.99351 },
    { rank: 5, attack: 7, defense: 15, stamina: 15, cap: 51, value: 1709291, level: 50.5, cp: 1498, percentage: 0.9932 }
  ]
}
```

## Output format

As demonstrated above, the output of `queryPvPRank` is an object mapping league names to an array.
If no viable combinations are found for a specific league, i.e. if an empty array is to be returned, the key will not be present in the object.
The array contains a list of combinations ordered by evolutions, then by temp evolutions, then by level caps, for example, `Ralts, Kirlia, Gardevoir L50, Gardevoir L51, Mega Gardevoir, Gallade L50, Gallade L51, Mega Gallade`.

Each combination is an object having the following field:

* `pokemon`: (`HoloPokemonId`)
* `[form]`: (`PokemonDisplayProto.Form`) This field will be unset if the value is `FORM_UNSET = 0`.
* `[evolution]`: (`HoloTemporaryEvolutionId`) This field will be unset if the value is `TEMP_EVOLUTION_UNSET = 0`.
* `cap`: (`number`) Level cap used for calculation. The actual level cap could be increased further without impacting the ranking. See `capped`.
* `[capped]`: (`boolean`) This indicates whether the combination is futureproof, i.e. increasing the level cap further will not change anything for this combination. You should **not** display `cap` in the UI if `capped = true`. This field will be unset if the value is `false`.
* `level`: (`number`) The level that the combination could be powered up to, with respect to both the CP cap of the league and the current level `cap`.
* `cp`: (`number`) CP of the combination when powered up.
* `value`: (`number`) Stat product of the combination when powered up, floored to an integer.
* `percentage`: (`number`) A number between 0 and 1 indicating its stats product percentage comparing to that of the rank 1 in the same conditions.

For functionally perfect, only the following fields are processed: `pokemon`, `form`, `level`, `rank = 1`, `percentage = 1`.

The output could be further filtered using a subset of level caps via `Ohbem.filterLevelCaps`.
For example:

```js
Ohbem.filterLevelCaps(ohbem.queryPvPRank(661, 0, 0, 1, 15, 15, 14, 1).great, [51]);
[
  { pokemon: 662, cap: 51, value: 1743985, level: 41.5, cp: 1493, percentage: 0.94736, rank: 1328 },
  { pokemon: 663, cap: 50, value: 1756548, level: 23.5, cp: 1476, percentage: 0.94144, rank: 2867, capped: true }
]
```


## License

Apache 2.0
