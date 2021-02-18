<template>
  <div>
    <Card>
      <div class="py-4 px-8 mt-3">
        <div class="flex flex-col mb-8">
          <h2 class="text-gray-700 font-semibold text-2xl tracking-wide mb-2">
            Swap
          </h2>
          <p class="text-gray-500 text-base">
            Enter the amount of currency that you would like to swap.
          </p>
        </div>
        <div class="bg-gray-100 rounded-lg mb-4">
          <div class="py-4 px-4">
            <div class="flex flex-row flex-wrap">
              <div class="flex flex-col flex-grow mr-4">
                <NumberInput
                  v-model="firstAmount"
                  :disabled="!rawStore.applicationData"
                  @change="onFirstInputChange"
                  @input.native="onFirstInputChange"
                />
              </div>
              <div class="flex flex-col">
                <t-select
                  :value="firstAsset.assetName.toUpperCase()"
                  class="h-full"
                  :options="firstCurrencyOptions"
                  @input="onFirstCurrencyChange"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col justify-center items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-4"
          >
            <path
              fillRule="evenodd"
              d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div class="bg-gray-100 rounded-lg mt-4">
          <div class="py-4 px-4">
            <div class="flex flex-row flex-wrap">
              <div class="flex flex-col flex-grow mr-4">
                <NumberInput
                  v-model="secondAmount"
                  :disabled="!rawStore.applicationData"
                  @change="onSecondInputChange(true)"
                  @input.native="onSecondInputChange(false)"
                />
              </div>
              <div class="flex flex-col">
                <t-select
                  :value="secondAsset.assetName.toUpperCase()"
                  class="h-full"
                  :options="secondCurrencyOptions"
                  @input="onSecondCurrencyChange"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="py-4">
          <ActionButton
            label="Swap"
            :execute="onSwap"
            :validate="validate"
            :error="error"
          />
        </div>
      </div>
      <div
        v-if="Object.keys(globalState).length !== 0"
        class="bg-gray-100 rounded-lg"
      >
        <div class="py-4 px-4">
          <div class="flex flex-col">
            <div class="flex flex-row">
              <div>Exchange rate:</div>
              <div class="text-right flex-grow font-bold">
                {{ exchangeRateDisplay }}
              </div>
            </div>
            <div class="flex flex-row">
              <div />
              <div class="text-right flex-grow font-bold">
                {{ reverseExchangeRateDisplay }}
              </div>
            </div>
            <div class="flex flex-row">
              <div>Price impact:</div>
              <div class="text-right flex-grow font-bold">
                {{ priceImpactDisplay }}
              </div>
            </div>
            <div class="flex flex-row">
              <div>Liquidity fee:</div>
              <div class="text-right flex-grow font-bold">
                {{ feeDisplay }}
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
import { getInputError } from '@/utils/validation';
import ActionButton from '../ActionButton';
import { ASSET_PAIRS, ASSETS } from '@/utils/assetPairs';
import Card from '@/components/cards/Card';
import NumberInput from '@/components/NumberInput';

export default {
  name: 'SwapCard',
  components: {
    NumberInput,
    ActionButton,
    Card,
  },
  data() {
    return {
      firstAmount: null,
      secondAmount: null,
      feePercentage: 3,
      error: null,
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
      globalState: 'algorand/globalState',
      exchangeCalculator: 'algorand/exchangeCalculator',
      currentPair: 'algorand/currentPair',
    }),
    primaryAsset() {
      return this.currentPair.primaryAsset;
    },
    secondaryAsset() {
      return this.currentPair.secondaryAsset;
    },
    firstAsset() {
      return this.currentPair.reversedKey ? this.secondaryAsset : this.primaryAsset;
    },
    secondAsset() {
      return this.currentPair.reversedKey ? this.primaryAsset : this.secondaryAsset;
    },
    firstCurrencyOptions() {
      return Object.keys(ASSETS).map((key) => {
        return key.toUpperCase();
      });
    },
    secondCurrencyOptions() {
      let pairs = Object.keys(ASSET_PAIRS).map((pair) => pair.split('/'));
      pairs = pairs.filter((pair) => {
        return pair[0] === this.firstAsset.assetName.toUpperCase();
      });
      pairs.push([null, this.firstAsset.assetName.toUpperCase()]);
      return pairs.map((pair) => pair[1]);
    },
    globalExchangeRate() {
      return this.exchangeCalculator.getGlobalExchangeRate();
    },
    exchangeRate() {
      if (this.currentPair.reversedKey) {
        return this.exchangeCalculator.getSwapExchangeRate(0, this.secondaryAsset.getRawAssetAmount(this.firstAmount));
      } else {
        return this.exchangeCalculator.getSwapExchangeRate(this.primaryAsset.getRawAssetAmount(this.firstAmount), 0);
      }
    },
    reverseExchangeRate() {
      if (this.currentPair.reversedKey) {
        return this.exchangeCalculator.getReverseSwapExchangeRate(0, this.secondaryAsset.getRawAssetAmount(this.firstAmount));
      } else {
        return this.exchangeCalculator.getReverseSwapExchangeRate(this.primaryAsset.getRawAssetAmount(this.firstAmount), 0);
      }
    },
    exchangeRateDisplay() {
      if (!this.exchangeRate || !isFinite(this.exchangeRate)) {
        return 'N/A';
      }
      const value = this.primaryAsset.getAssetDisplayAmount(
        this.secondaryAsset.getRawAssetAmount(this.exchangeRate) / this.currentPair.ratio, this.currentPair.ratioDecimalPoints
      );
      return `${value} ${this.primaryAsset.assetName.toUpperCase()} PER ${this.secondaryAsset.assetName.toUpperCase()}`;
    },
    reverseExchangeRateDisplay() {
      if (!this.reverseExchangeRate || !isFinite(this.reverseExchangeRate)) {
        return 'N/A';
      }
      const value = this.secondaryAsset.getAssetDisplayAmount(
        this.primaryAsset.getRawAssetAmount(this.reverseExchangeRate) / this.currentPair.ratio, this.currentPair.ratioDecimalPoints
      );
      return `${value} ${this.secondaryAsset.assetName.toUpperCase()} PER ${this.primaryAsset.assetName.toUpperCase()}`;
    },
    priceImpact() {
      const difference =
        Math.trunc(
          (Math.abs(this.exchangeRate - this.globalExchangeRate) *
            this.currentPair.ratio) /
          this.globalExchangeRate
        ) / this.currentPair.ratio;
      return difference;
    },
    priceImpactDisplay() {
      if (!isFinite(this.priceImpact) || !this.firstAmount || !this.secondAmount) {
        return 'N/A';
      }
      return (this.priceImpact * 100).toFixed(2) + ' %';
    },
    fee() {
      if (this.currentPair.reversedKey) {
        return this.exchangeCalculator.getSecondaryToPrimaryFee(
          this.secondaryAsset.getRawAssetAmount(this.firstAmount)
        );
      } else {
        return this.exchangeCalculator.getPrimaryToSecondaryFee(this.primaryAsset.getRawAssetAmount(this.firstAmount));
      }
    },
    feeDisplay() {
      if (!this.fee) {
        return 'N/A';
      }
      const value = this.secondAsset.getAssetDisplayAmount(this.fee, this.currentPair.ratioDecimalPoints);
      return `${value} ${this.secondAsset.assetName.toUpperCase()}`;
    },
  },

  watch: {
    currentPair() {
      this.firstAmount = null;
      this.secondAmount = null;
      this.onFirstInputChange();
    }
  },
  methods: {
    onFirstCurrencyChange(value) {
      const splittedKey = this.currentPair.key.split('/');
      const potentialPair = `${value}/${this.secondAsset.assetName.toUpperCase()}`;
      if (ASSET_PAIRS[potentialPair]) {
        this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: potentialPair });
      } else if (value === splittedKey[1]) {
        const reversedKey = [splittedKey[1], splittedKey[0]].join('/');
        this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: reversedKey });
      } else {
        let pairs = Object.keys(ASSET_PAIRS).map((pair) => pair.split('/'));
        pairs = pairs.filter((pair) => {
          return pair[0] === value;
        });
        pairs = pairs.map((pair) => pair[1]);
        const newKey = [value, pairs[0]].join('/');
        this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: newKey });
      }
      this.firstAmount = null;
      this.secondAmount = null;
      this.onFirstInputChange();
    },
    onSecondCurrencyChange(value) {
      const potentialPair = `${this.firstAsset.assetName.toUpperCase()}/${value}`;
      const splittedKey = this.currentPair.key.split('/');
      if (ASSET_PAIRS[potentialPair]) {
        this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: potentialPair });
      } else if (value === splittedKey[0]) {
        const reversedKey = [splittedKey[1], splittedKey[0]].join('/');
        this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: reversedKey });
      } else {
        let pairs = Object.keys(ASSET_PAIRS).map((pair) => pair.split('/'));
        pairs = pairs.filter((pair) => {
          return pair[1] === value;
        });
        pairs = pairs.map((pair) => pair[0]);
        const newKey = [pairs[0], value].join('/');
        this.$store.dispatch('algorand/SET_CURRENT_PAIR', { pairKey: newKey });
      }
      this.firstAmount = null;
      this.secondAmount = null;
      this.onFirstInputChange();
    },
    onFirstInputChange() {
      this.validate();
      if (!this.globalState) {
        return;
      } else if (this.firstAmount === null || this.firstAmount === '') {
        this.secondAmount = null;
        return;
      }
      if (this.currentPair.reversedKey) {
        const rawSecondary = this.secondaryAsset.getRawAssetAmount(this.firstAmount);
        const rawPrimary = this.exchangeCalculator.secondaryToPrimary(rawSecondary);
        this.secondAmount = this.primaryAsset.getAssetDisplayAmount(rawPrimary);
      } else {
        const rawPrimary = this.primaryAsset.getRawAssetAmount(this.firstAmount);
        const rawSecondary = this.exchangeCalculator.primaryToSecondary(rawPrimary);
        this.secondAmount = this.secondaryAsset.getAssetDisplayAmount(rawSecondary);
      }
    },
    onSecondInputChange(recalculate) {
      this.validate();
      if (!this.globalState) {
        return;
      } else if (this.secondAmount === null || this.secondAmount === '') {
        this.firstAmount = null;
        return;
      }
      if (this.currentPair.reversedKey) {
        const rawPrimary = this.primaryAsset.getRawAssetAmount(this.secondAmount);
        const rawSecondary = this.exchangeCalculator.reverseSecondaryToPrimary(rawPrimary);
        this.firstAmount = this.secondaryAsset.getAssetDisplayAmount(rawSecondary);
        const secondAmount = this.primaryAsset.getAssetDisplayAmount(this.exchangeCalculator.secondaryToPrimary(rawPrimary));
        if (recalculate || secondAmount < this.secondAmount) {
          this.secondAmount = secondAmount;
        }
      } else {
        const rawSecondary = this.secondaryAsset.getRawAssetAmount(this.secondAmount);
        const rawPrimary = this.exchangeCalculator.reversePrimaryToSecondary(rawSecondary);
        this.firstAmount = this.primaryAsset.getAssetDisplayAmount(rawPrimary);
        const secondAmount = this.secondaryAsset.getAssetDisplayAmount(
          this.exchangeCalculator.primaryToSecondary(rawPrimary)
        );
        if (recalculate || secondAmount < this.secondAmount) {
          this.secondAmount = secondAmount;
        }
      }
    },
    validate() {
      let error = null;
      error = getInputError(
        this.firstAmount,
        this.firstAsset.decimalPoints,
        this.firstAsset.assetName
      );
      error =
        error ||
        getInputError(this.secondAmount, this.secondAsset.decimalPoints, this.secondAsset.assetName);

      this.error = error;
      this.$forceUpdate();
      return !error;
    },
    async onSwap() {
      const accountAddress = this.rawStore.account;
      if (this.currentPair.reversed) {
        await this.waitForAction(() =>
          this.rawStore.serviceInstance.swapSecondary(
            accountAddress,
            this.secondaryAsset.getRawAssetAmount(this.firstAmount)
          )
        );
      } else {
        await this.waitForAction(() =>
          this.rawStore.serviceInstance.swapPrimary(
            accountAddress,
            this.primaryAsset.getRawAssetAmount(this.firstAmount)
          )
        );
      }
      this.firstAmount = null;
      this.secondAmount = null;
    },
  },
};
</script>
