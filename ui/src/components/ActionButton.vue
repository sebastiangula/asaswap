<template>
  <div>
    <div v-if="!rawStore.serviceInstance">
      <t-button
        disabled
        classes="block tracking-widest w-full uppercase text-center shadow bg-indigo-600 hover:bg-indigo-700 focus:shadow-outline focus:outline-none text-white text-xs py-3 px-10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Install AlgoSigner
      </t-button>
    </div>
    <div v-else-if="rawStore.serviceInstance && !rawStore.connected">
      <t-button
        classes="block tracking-widest w-full uppercase text-center shadow bg-indigo-600 hover:bg-indigo-700 focus:shadow-outline focus:outline-none text-white text-xs py-3 px-10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        @click="onConnect"
      >
        Connect to AlgoSigner
      </t-button>
    </div>
    <div v-else-if="!isReady">
      <t-button
        disabled
        classes="block tracking-widest w-full uppercase text-center shadow bg-indigo-600 hover:bg-indigo-700 focus:shadow-outline focus:outline-none text-white text-xs py-3 px-10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span class="inline-block pr-2 align-middle spinner">
          <Spinner size="tiny" />
        </span>
        <span>Waiting for AlgoSigner...</span>
      </t-button>
    </div>
    <div v-else-if="currentRouteName !== 'Withdraw' && (userState.USR_B || userState.USR_A)">
      <t-button
        disabled
        classes="block tracking-widest w-full uppercase text-center shadow bg-indigo-600 hover:bg-indigo-700 focus:shadow-outline focus:outline-none text-white text-xs py-3 px-10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ error || label }}
      </t-button>
    </div>
    <div v-else>
      <t-button
        :disabled="!isReadyToTransact || !enable || !!error"
        classes="block tracking-widest w-full uppercase text-center shadow bg-indigo-600 hover:bg-indigo-700 focus:shadow-outline focus:outline-none text-white text-xs py-3 px-10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        @click="onExecute"
      >
        {{ error || label }}
      </t-button>
    </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import Spinner from 'vue-simple-spinner';

export default {
  name: 'ActionButton',
  components: {
    Spinner
  },
  props: {
    label: {
      type: String,
      required: true,
    },
    enable: {
      type: Boolean,
      default: true,
    },
    execute: {
      type: Function,
      required: true,
    },
    validate: {
      type: Function,
      default: null,
      required: false,
    },
    error: {
      type: String,
      default: null,
      required: false,
    },
  },
  data() {
    return {
      executeAfterOptingIn: false
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
      userState: 'algorand/userState',
      isReady: 'algorand/isReadyToTransact',
      isReadyToTransact: 'algorand/isReadyToTransact',
      isOptedIn: 'algorand/isOptedIn'
    }),
    currentRouteName() {
      return this.$route.name;
    }
  },
  watch: {
    isOptedIn(value) {
      if (value && this.executeAfterOptingIn) {
        this.executeAfterOptingIn = false;
        this.execute();
      }
    }
  },
  mounted() {
    if (this.validate) {
      this.validate();
    }
  },
  methods: {
    onInstallAlgoSigner() {
      window.open('https://chrome.google.com/webstore/detail/algosigner/kmmolakhbgdlpkjkcjkebenjheonagdm', '_blank');
    },
    onConnect() {
      this.$store.dispatch('algorand/CONNECT');
    },
    async onExecute() {
      if (this.validate) {
        if (!await this.validate()) {
          return;
        }
      }
      if (!this.isOptedIn) {
        this.executeAfterOptingIn = true;
        await this.optIn();
      } else {
        await this.execute();
      }
    },
    async optIn() {
      await this.waitForAction(async () => await this.$store.dispatch('algorand/OPT_IN'), 'Opting-In to Application...');
    }
  },
};
</script>
<style scoped>
.spinner {
  position: relative;
  bottom: 1px;
}
</style>
