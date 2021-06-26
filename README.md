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
* Optional built-in caching


## Usage

Install it with `npm`.

```sh
npm install ohbem

# Optional dependencies:
# if you want to use fetchPokemonData
npm install --save axios
# if you want to use cachingStrategy
npm install --save lru-cache
```

Ohbem in action:

```js
const Ohbem = require('ohbem');

// if you want to install axios and use built-in fetcher
const pokemonData = await Ohbem.fetchPokemonData();

const ohbem = new Ohbem({
    // all of the following options are optional and these are the default values
    leagues: {
        little: 500,
        great: 1500,
        // alternative format
        ultra: {
            little: false,
            cap: 2500,
        },
    },
    levelCaps: [50, 51],
    // The following field is required to use queryPvPRank
    // pokemonData,
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
    {
      pokemon: 605,
      cap: 50,
      value: 320801,
      level: 14.5,
      cp: 494,
      percentage: 0.95123,
      rank: 548,
      capped: true
    }
  ],
  great: [
    {
      pokemon: 605,
      cap: 50,
      value: 1444316,
      level: 50,
      cp: 1348,
      percentage: 0.84457,
      rank: 3158
    },
    {
      pokemon: 605,
      cap: 51,
      value: 1472627,
      level: 51,
      cp: 1364,
      percentage: 0.85568,
      rank: 3128
    },
    {
      pokemon: 606,
      cap: 50,
      value: 1630080,
      level: 20,
      cp: 1483,
      percentage: 0.97364,
      rank: 384,
      capped: true
    }
  ],
  ultra: [
    {
      pokemon: 606,
      cap: 50,
      value: 3530858,
      level: 37,
      cp: 2484,
      percentage: 0.97604,
      rank: 512,
      capped: true
    }
  ]
}
```

## License

Apache 2.0
