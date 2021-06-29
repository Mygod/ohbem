const POGOProtos = require("pogo-protos");

module.exports = function addPokemonDataHelpers(pokemonData) {
    /**
     * Look up base stats of a Pokemon.
     *
     * @param pokemonId {POGOProtos.Rpc.HoloPokemonId}
     * @param [form] {POGOProtos.Rpc.PokemonDisplayProto.Form}
     * @returns {Object}
     */
    pokemonData.findBaseStats = (pokemonId, form = POGOProtos.Rpc.PokemonDisplayProto.Form.FORM_UNSET) => {
        const masterPokemon = pokemonData[pokemonId];
        const masterForm = form ? masterPokemon.forms[form] || masterPokemon : masterPokemon;
        return masterForm.attack ? masterForm : masterPokemon;
    };

    /**
     * Check whether the stats for a given mega is speculated.
     *
     * @param pokemonId {POGOProtos.Rpc.HoloPokemonId}
     * @param evolution {POGOProtos.Rpc.HoloTemporaryEvolutionId}
     * @returns {boolean}
     */
    pokemonData.isMegaUnreleased = (pokemonId, evolution) => {
        return pokemonData[pokemonId].temp_evolutions[evolution].unreleased;
    };

    return pokemonData;
};
