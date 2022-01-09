module.exports = function addPokemonDataHelpers(pokemonData) {
    /**
     * Look up base stats of a Pokemon.
     *
     * @param pokemonId {number}
     * @param [form] {number}
     * @param [evolution] {number}
     * @returns {Object}
     */
    pokemonData.findBaseStats = (pokemonId, form = 0, evolution = 0) => {
        const masterPokemon = pokemonData.pokemon[pokemonId];
        const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
        const masterEvolution = evolution ? masterForm.temp_evolutions[evolution] : masterForm;
        return masterEvolution.attack ? masterEvolution : masterForm.attack ? masterForm : masterPokemon;
    };

    /**
     * Check whether the stats for a given mega is speculated.
     *
     * @param pokemonId {number}
     * @param evolution {number}
     * @returns {boolean}
     */
    pokemonData.isMegaUnreleased = (pokemonId, evolution) => {
        return pokemonData.pokemon[pokemonId].temp_evolutions[evolution].unreleased;
    };

    return pokemonData;
};
