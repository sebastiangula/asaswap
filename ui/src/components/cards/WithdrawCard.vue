<template>
  <div>
    <Card>
      <div class="py-4 px-8 mt-3">
        <div class="flex flex-col mb-8">
          <h2 class="text-gray-700 font-semibold text-2xl tracking-wide mb-2">
            Withdraw
          </h2>
          <p class="text-gray-500 text-base">
            The following amounts are available to withdraw.
          </p>
          <p class="text-gray-500 text-base">
            You need to withdraw them in full before performing any other operation.
          </p>
        </div>
        <div v-if="!!(userState.USR_A || userState.USR_B)">
          <div>
            <NumberInput
              :value="primaryAssetBalance"
              :label="currentPair.primaryAsset.assetName"
              disabled
            />
          </div>
          <div class="mt-4">
            <NumberInput
              :label="currentPair.secondaryAsset.assetName"
              :value="secondaryAssetBalance"
              disabled
            />
          </div>
          <div class="py-4">
            <ActionButton
              label="Withdraw"
              :enable="!!(userState.USR_A || userState.USR_B)"
              :execute="onWithdraw"
            />
          </div>
        </div>
        <div v-else>
          <div class="bg-indigo-500 rounded-lg px-4 py-4 text-center mb-4 text-white">
            There is nothing to withdraw
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import NumberInput from '../NumberInput';
import ActionButton from '../ActionButton';
import Card from './Card';

export default {
  name: 'WithdrawCard',
  components: {
    NumberInput,
    ActionButton,
    Card
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
      userAssets: 'algorand/userAssets',
      currentPair: 'algorand/currentPair'
    }),
    primaryAssetBalance() {
      return Number(this.currentPair.primaryAsset.getAssetDisplayAmount(this.userState['USR_A'] || 0));
    },
    secondaryAssetBalance() {
      return Number(this.currentPair.secondaryAsset.getAssetDisplayAmount(this.userState['USR_B'] || 0));
    },
    assetsToOptIn() {
      const assets = [];
      if (this.currentPair.primaryAsset.assetIndex && !this.userAssets[this.currentPair.primaryAsset.assetIndex]) {
        assets.push(this.currentPair.primaryAsset);
      }
      if (this.currentPair.secondaryAsset.assetIndex && !this.userAssets[this.currentPair.secondaryAsset.assetIndex]) {
        assets.push(this.currentPair.secondaryAsset);
      }
      return assets;
    }
  },
  watch: {
    assetsToOptIn(value) {
      if (value.length === 0 && this.executeAfterOptingIn) {
        this.executeAfterOptingIn = false;
        const accountAddress = this.rawStore.account;
        this.waitForAction(() => this.rawStore.serviceInstance.withdraw(accountAddress, this.userState['USR_A'], this.userState['USR_B']));
      }
    }
  },
  methods: {
    async onWithdraw() {
      const accountAddress = this.rawStore.account;
      if (this.assetsToOptIn.length > 0) {
        await this.waitForAction(() => this.rawStore.serviceInstance.optInAsset(this.assetsToOptIn[0], accountAddress), 'Opting-In to Asset...');
        this.executeAfterOptingIn = true;
      } else {
        await this.waitForAction(() => this.rawStore.serviceInstance.withdraw(accountAddress, this.userState['USR_A'], this.userState['USR_B']));
      }
    }
  }
};
</script>
