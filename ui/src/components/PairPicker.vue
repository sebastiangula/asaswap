<template>
  <div>
    <t-select
      classes="block text-xs pl-2 pr-8 py-2 text-black placeholder-gray-400 transition duration-100 ease-in-out bg-white border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
      :options="pairs"
      :value="currentPair.key"
      @input="onPairChange"
    />
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import { ASSET_PAIRS } from '@/utils/assetPairs';

export default {
  name: 'PairPicker',
  computed: {
    ...mapGetters({
      currentPair: 'algorand/currentPair'
    }),
    pairs() {
      return Object.keys(ASSET_PAIRS);
    }
  },
  methods: {
    onPairChange(value) {
      this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: value });
    },
  }
};
</script>
