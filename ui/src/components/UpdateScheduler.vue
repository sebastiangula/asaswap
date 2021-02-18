<template>
  <div />
</template>
<script>
import { mapGetters } from 'vuex';

export default {
  name: 'UpdateScheduler',
  data() {
    return {
      interval: null,
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
    }),
  },
  created() {
    this.interval = setInterval(this.updateState, 6000);
  },
  destroy() {
    clearInterval(this.interval);
  },
  methods: {
    updateState() {
      if (this.rawStore.pendingAction) {
        return;
      }
      if (this.rawStore.connected) {
        this.$store.dispatch('algorand/FETCH_ACCOUNT_DATA');
      }
      this.$store.dispatch('algorand/FETCH_APPLICATION_DATA');
      this.$store.dispatch('algorand/FETCH_ACCOUNTS');
    }
  }
};
</script>
