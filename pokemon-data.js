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
    return pokemonData;
};
