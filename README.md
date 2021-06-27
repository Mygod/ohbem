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
# if you want to use fetchPokemonData
npm install --save axios
# if you want to use cachingStrategy other than cpuHeavy
npm install --save lru-cache
```

Ohbem in action:

```js
const Ohbem = require('ohbem');

// if you want to install axios and use built-in fetcher
const pokemonData = await Ohbem.fetchPokemonData();

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
    pokemonData,
    // If you have installed lru-cache, uncomment the following to use cache:
    // cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
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

## License

Apache 2.0
