<template>
  <div id="app">
    <Navbar />
    <div class="absolute w-full">
      <WithdrawalAlert v-if="userState.USR_A || userState.USR_B" />
      <Alert
        v-if="alert.type"
        :header="alert.header"
        :message="alert.message"
        :alert-type="alert.type"
      />
    </div>
    <UpdateScheduler />
    <SelectAccountModal v-if="showSelectAccount" />
    <AccountModal v-if="showAccount" />
    <ActionModal
      v-if="rawStore.pendingUpdate || !!rawStore.pendingAction"
      :message="actionMessage"
    />
    <router-view />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { ALGORAND_LEDGER } from './config';
import Navbar from './components/Navbar';
import Alert from './components/Alert';
import UpdateScheduler from './components/UpdateScheduler';
import SelectAccountModal from './components/modals/SelectAccountModal';
import AccountModal from './components/modals/AccountModal';
import ActionModal from './components/modals/ActionModal';
import eventBus from './utils/eventBus';
import WithdrawalAlert from './components/WithdrawalAlert.vue';

export default {
  name: 'App',
  components: {
    Navbar,
    UpdateScheduler,
    SelectAccountModal,
    AccountModal,
    Alert,
    ActionModal,
    WithdrawalAlert
  },
  data() {
    return {
      showSelectAccount: false,
      showAccount: false,
      alert: {}
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
      userState: 'algorand/userState'
    }),
    actionMessage() {
      if (this.rawStore.pendingAction) {
        if (this.rawStore.pendingActionMessage) {
          return this.rawStore.pendingActionMessage;
        } else {
          return 'Processing action...';
        }
      } else if (this.rawStore.pendingUpdate) {
        return 'Waiting for update...';
      }
      return '';
    }
  },
  mounted() {
    eventBus.$on('open-select-account', this.openSelectAccount);
    eventBus.$on('open-account', this.openAccount);
    eventBus.$on('close-modals', this.closeModals);
    eventBus.$on('open-alert', this.openAlert);
    eventBus.$on('close-alert', this.closeAlert);
    eventBus.$on('transaction-success', this.onTransactionSuccess);
    eventBus.$on('set-action-message', this.onSetActionMessage);
    this.$store.dispatch('algorand/FETCH_APPLICATION_DATA');
    this.$store.dispatch('algorand/GET_SERVICE_INSTANCE');
  },
  methods: {
    openSelectAccount() {
      this.showSelectAccount = true;
    },
    openAccount() {
      this.showAccount = true;
    },
    closeModals() {
      this.showSelectAccount = false;
      this.showAccount = false;
    },
    closeAlert() {
      this.alert = {};
    },
    openAlert(alert) {
      this.alert = alert;
      this.$forceUpdate();
    },
    onTransactionSuccess(txId) {
      let address;
      if (ALGORAND_LEDGER == 'TestNet') {
        address = 'https://testnet.algoexplorer.io/tx/';
      } else {
        address = 'https://testnet.algoexplorer.io/tx/';
      }
      eventBus.$emit('open-alert', {
        type: 'success',
        message: `Transaction has been successfuly processed. Click <a href="${address}${txId}" target="_blank" class="underline">here</a> to preview the transaction.`
      });
    },
    onSetActionMessage(actionMessage) {
      this.$store.commit('algorand/SET_PENDING_ACTION_MESSAGE', actionMessage);
    }
  }
};
</script>
<style>
body {
  background-color: lightgray;
}
</style>
