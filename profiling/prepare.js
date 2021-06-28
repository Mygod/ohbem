const fs = require('fs');
const path = require('path');

const Ohbem = require('..');

(async () => {
    fs.writeFileSync(path.join(__dirname, 'cached.json'), JSON.stringify(await Ohbem.fetchPokemonData()));
})();
