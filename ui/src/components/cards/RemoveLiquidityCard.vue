<template>
  <div>
    <Card>
      <div class="py-4 px-8 mt-3">
        <div class="flex flex-col mb-8">
          <h2 class="text-gray-700 font-semibold text-2xl tracking-wide mb-2">
            Remove Liquidity
          </h2>
          <p class="text-base text-gray-500">
            Enter the amount of liquidity that you would like to remove.
          </p>
          <p
            v-if="maximumValueDisplay"
            class="text-base text-gray-500"
          >
            You have <b>{{ maximumValueDisplay }}</b> liquidity tokens that
            you can remove.
          </p>
          <p
            v-else
            class="text-base text-gray-500"
          >
            You have not provided liquidity to the pool yet.
          </p>
        </div>

        <div>
          <NumberInput
            v-model="liquidityTokens"
            label="Liquidity Tokens"
            :max="userState.USR_LIQ"
            placeholder="0"
            :allow-decimals="false"
            @change="validate"
          />
        </div>
        <div class="py-4">
          <ActionButton
            label="Remove Liquidity"
            :execute="onAddLiquidity"
            :validate="validate"
            :error="error"
          />
        </div>
      </div>
      <div
        v-if="isReady"
        class="bg-gray-100 rounded-lg"
      >
        <div class="py-4 px-4">
          Corresponding amounts to remove from the pool:
          <div class="flex flex-col">
            <div class="flex flex-row">
              <div>{{ primaryAsset.assetName }}:</div>
              <div class="text-right flex-grow font-bold">
                {{ amountOfPrimaryAssetDisplay }}
              </div>
            </div>
            <div class="flex flex-row">
              <div>{{ secondaryAsset.assetName }}:</div>
              <div class="text-right flex-grow font-bold">
                {{ amountOfSecondaryAssetDisplay }}
              </div>
            </div>
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
  name: 'RemoveLiquidityCard',
  components: {
    NumberInput,
    ActionButton,
    Card
  },
  data() {
    return {
      liquidityTokens: null,
      error: null,
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
      isReady: 'algorand/isReady',
      userState: 'algorand/userState',
      globalState: 'algorand/globalState',
      currentPair: 'algorand/currentPair'
    }),
    primaryAsset() {
      return this.currentPair.primaryAsset;
    },
    secondaryAsset() {
      return this.currentPair.secondaryAsset;
    },
    maximumValueDisplay() {
      return this.userState['USR_LIQ'];
    },
    amountOfPrimaryAsset() {
      if (this.globalState['LIQ'] === 0) {
        return;
      }
      let value = Math.trunc(
        (this.globalState['A'] * this.liquidityTokens) /
          this.globalState['LIQ']
      );
      if (typeof value !== 'number' || isNaN(value)) {
        return;
      }
      return this.primaryAsset.getAssetDisplayAmount(value);
    },
    amountOfSecondaryAsset() {
      if (this.globalState['LIQ'] === 0) {
        return;
      }
      const value = Math.trunc(
        (this.globalState['B'] * this.liquidityTokens) /
        this.globalState['LIQ']
      );
      if (typeof value !== 'number' || isNaN(value)) {
        return value;
      }
      return this.secondaryAsset.getAssetDisplayAmount(value);
    },
    amountOfPrimaryAssetDisplay() {
      if (typeof this.amountOfPrimaryAsset !== 'number') {
        return 'N/A';
      }
      if (this.amountOfPrimaryAsset < 0) {
        return 0;
      }
      return this.amountOfPrimaryAsset;
    },
    amountOfSecondaryAssetDisplay() {
      if (typeof this.amountOfPrimaryAsset !== 'number') {
        return 'N/A';
      }
      return this.amountOfSecondaryAsset;
    },
  },
  watch: {
    userState() {
      this.validate();
    },
    currentPair() {
      this.liquidityTokens = null;
      this.validate();
    }
  },
  methods: {
    validate() {
      const userLiquidity = this.userState['USR_LIQ'] ? Number(this.userState['USR_LIQ']) : 0;
      if (Number(this.liquidityTokens) <= 0) {
        this.error = 'Enter a valid amount';
      } else if (Number(this.liquidityTokens) > userLiquidity) {
        this.error = 'Enter a valid amount';
      } else if (!Number.isInteger(Number(this.liquidityTokens))) {
        this.error = 'Must be an integer';
      } else if (!(this.amountOfPrimaryAsset > 0 || this.amountOfSecondaryAssetDisplay > 0)) {
        this.error = 'Enter a valid amount';
      } else {
        this.error = null;
      }
      return !this.error;
    },
    async onAddLiquidity() {
      const accountAddress = this.rawStore.account;
      await this.waitForAction(() =>
        this.rawStore.serviceInstance.removeLiquidity(
          accountAddress,
          this.liquidityTokens
        )
      );
      this.liquidityTokens = 0;
    },
  },
};
</script>
