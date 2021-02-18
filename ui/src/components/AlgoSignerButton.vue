<template>
  <div class="flex pr-2">
    <div v-if="!rawStore.serviceInstance">
      <t-button
        class="inline-flex whitespace-nowrap items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
        @click="onInstallAlgoSigner"
      >
        Install AlgoSigner
      </t-button>
    </div>
    <div v-else-if="rawStore.serviceInstance && !rawStore.connected">
      <t-button
        class="inline-flex items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
        @click="onConnect"
      >
        Connect
      </t-button>
    </div>
    <t-button
      v-else-if="!rawStore.fetchedAccounts"
      class="inline-flex whitespace-nowrap items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
    >
      Please wait...
    </t-button>
    <t-button
      v-else-if="rawStore.accounts.length === 0"
      class="inline-flex whitespace-nowrap items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
    >
      No accounts
    </t-button>
    <div
      v-else-if="isReady"
    >
      <t-button
        class="inline-flex items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
        @click="onSelectAccount"
      >
        {{ accountDisplay }}
        <img
          :src="logo"
          class="logo ml-2"
        >
      </t-button>
    </div>
    <t-button
      v-else
      class="inline-flex whitespace-nowrap items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
    >
      Please wait...
    </t-button>
    <t-button
      class="ml-2 inline-flex items-center h-8 px-4 m-2 text-sm text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-lg focus:shadow-outline hover:bg-indigo-800"
      :disabled="!isReady"
      @click="onShowAccount"
    >
      Balances
    </t-button>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import eventBus from '@/utils/eventBus';

export default {
  name: 'AlgoSignerButton',
  data() {
    return {
      logo: require('@/assets/algorand-logo.svg'),
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
      isOptedIn: 'algorand/isOptedIn',
      isReady: 'algorand/isReady'
    }),
    accountDisplay() {
      const account = this.rawStore.account;
      return (
        account.substring(0, 3) +
        '...' +
        account.substring(account.length - 3, account.length)
      );
    },
  },
  methods: {
    onInstallAlgoSigner() {
      window.open(
        'https://chrome.google.com/webstore/detail/algosigner/kmmolakhbgdlpkjkcjkebenjheonagdm',
        '_blank'
      );
    },
    onConnect() {
      this.$store.dispatch('algorand/CONNECT');
    },
    onSelectAccount() {
      this.$store.dispatch('algorand/FETCH_ACCOUNTS');
      eventBus.$emit('open-select-account');
    },
    onShowAccount() {
      eventBus.$emit('open-account');
    },
  },
};
</script>
<style scoped>
.logo {
  display: inline;
  height: 0.75rem;
}
</style>
