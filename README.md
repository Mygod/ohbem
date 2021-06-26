# Ohbem

Ohbem is a judgemental library that computes PvP rankings for Pokemon GO.

## Usage

Install it with `npm`.

```sh
npm install

# Optional dependencies:
# if you want to use fetchPokemonMaster
npm install --save axios
# if you want to use caching
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
        ultra: 2500,
    },
    levelCaps: [50, 51],
    // The following field is required to use queryPvPRank
    // pokemonData,
    // If you have installed lru-cache, uncomment the following to use cache:
    // cachingStrategy: Ohbem.cachingStrategies.memoryHeavy,
});
ohbem.queryPvPRank(
    /* pokemonId: */    605,
    /* formId: */       0,
    /* costumeId: */    0,
    /* gender: */       1,
    /* attack: */       1,
    /* defense: */      4,
    /* stamina: */      12,
    /* level: */        14,
);
```

## License

Apache 2.0
