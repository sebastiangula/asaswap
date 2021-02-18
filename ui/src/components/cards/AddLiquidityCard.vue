<template>
  <div>
    <Card>
      <div class="py-4 px-8 mt-3">
        <div class="flex flex-col mb-8">
          <h2 class="text-gray-700 font-semibold text-2xl tracking-wide mb-2">
            Add Liquidity
          </h2>
          <p class="text-gray-500 text-base">
            Enter the amount of liquidity that you would like to add.
          </p>
        </div>
        <div class="mt-4">
          <NumberInput
            v-model="primaryAmount"
            :label="currentPair.primaryAsset.assetName"
            @change="onAlgosInputChange(true)"
            @input.native="onAlgosInputChange(false)"
          />
        </div>
        <div class="mt-4">
          <NumberInput
            v-model="secondaryAmount"
            :label="currentPair.secondaryAsset.assetName"
            @change="onAssetInputChange(true)"
            @input.native="onAssetInputChange(false)"
          />
        </div>
        <div class="py-4">
          <ActionButton
            label="Add Liquidity"
            :execute="onAddLiquidity"
            :validate="validate"
            :error="error"
          />
        </div>
      </div>
      <div
        v-if="globalState !== {}"
        class="bg-gray-100 rounded-lg"
      >
        <div class="py-4 px-4">
          <div class="flex flex-col">
            <div class="flex flex-row">
              <div>Exchange rate:</div>
              <div class="text-right flex-grow font-bold">
                {{ primaryPerSecondary }}
              </div>
            </div>
            <div class="flex flex-row">
              <div />
              <div class="text-right flex-grow font-bold">
                {{ secondaryPerPrimary }}
              </div>
            </div>
            <div class="flex flex-row">
              <div>Liquidity Tokens:</div>
              <div class="text-right flex-grow font-bold">
                {{ liquidityTokensDisplay }}
              </div>
            </div>
            <div class="flex flex-row">
              <div>Pool Share:</div>
              <div class="text-right flex-grow font-bold">
                {{ poolShareDisplay }}
              </div>
            </div>
          </div>
        </div>
        <p class="px-4 py-4">
          By adding liquidity you'll earn 0.3% of all trades on this pair
          proportional to your share of the pool. Fees are added to the pool,
          accrued in real-time, and can be claimed by withdrawing your
          liquidity.
        </p>
      </div>
    </Card>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import NumberInput from '../NumberInput';
import { getInputError } from '@/utils/validation';
import ActionButton from '../ActionButton';
import Card from '@/components/cards/Card';

export default {
  name: 'AddLiquidityCard',
  components: {
    NumberInput,
    ActionButton,
    Card
  },
  data() {
    return {
      primaryAmount: null,
      secondaryAmount: null,
      error: null,
    };
  },
  computed: {
    ...mapGetters({
      rawStore: 'algorand/rawStore',
      globalState: 'algorand/globalState',
      exchangeCalculator: 'algorand/exchangeCalculator',
      currentPair: 'algorand/currentPair'
    }),
    primaryAsset() {
      return this.currentPair.primaryAsset;
    },
    secondaryAsset() {
      return this.currentPair.secondaryAsset;
    },
    exchangeRate() {
      return Math.trunc(
        (this.primaryAsset.getRawAssetAmount(this.primaryAmount) * this.currentPair.ratio) /
          this.secondaryAsset.getRawAssetAmount(this.secondaryAmount)
      );
    },
    globalExchangeRate() {
      return this.exchangeCalculator.getGlobalExchangeRate();
    },
    reverseGlobalExchangeRate() {
      return this.exchangeCalculator.getReverseGlobalExchangeRate();
    },
    primaryPerSecondary() {
      if (!this.globalExchangeRate || !isFinite(this.globalExchangeRate)) {
        return 'N/A';
      }
      const value = this.primaryAsset.getAssetDisplayAmount(
        this.secondaryAsset.getRawAssetAmount(this.globalExchangeRate) / this.currentPair.ratio,
        this.currentPair.ratioDecimalPoints
      );
      return `${value} ${this.primaryAsset.assetName.toUpperCase()} PER ${this.secondaryAsset.assetName.toUpperCase()}`;
    },
    secondaryPerPrimary() {
      if (!this.globalExchangeRate || !isFinite(this.globalExchangeRate)) {
        return 'N/A';
      }
      const value = this.secondaryAsset.getAssetDisplayAmount(
        this.primaryAsset.getRawAssetAmount(this.reverseGlobalExchangeRate) / this.currentPair.ratio,
        this.currentPair.ratioDecimalPoints
      );
      return `${value} ${this.secondaryAsset.assetName.toUpperCase()} PER ${this.primaryAsset.assetName.toUpperCase()}`;
    },
    difference() {
      const difference =
        Math.trunc(
          (Math.abs(this.exchangeRate - this.globalExchangeRate) * this.currentPair.ratio) /
            this.globalExchangeRate
        ) / this.currentPair.ratio;
      return difference;
    },
    isDifferenceCorrect() {
      if (isNaN(this.difference)) {
        return false;
      }
      return this.difference < 0.01;
    },
    liquidityTokens() {
      if (!this.globalState) {
        return;
      }
      if (this.globalState['LIQ'] === 0) {
        return this.primaryAsset.getRawAssetAmount(this.primaryAmount);
      }
      return Math.trunc(
        (this.primaryAsset.getRawAssetAmount(this.primaryAmount) * this.globalState['LIQ']) /
          this.globalState['A']
      );
    },
    liquidityTokensDisplay() {
      if (!this.liquidityTokens) {
        return 'N/A';
      }
      return this.liquidityTokens;
    },
    poolShareDisplay() {
      if (this.liquidityTokens && this.globalState['LIQ'] === 0) {
        return '100%';
      } else if (!this.globalState['LIQ']) {
        return '0%';
      }
      const value = (this.liquidityTokens * 100 / (this.globalState['LIQ'] + this.liquidityTokens)).toFixed(2);
      if (value >= 100) {
        return '99.99%';
      }
      return value + '%';
    }
  },
  watch: {
    currentPair() {
      this.primaryAmount = null;
      this.secondaryAmount = null;
      this.validate();
    }
  },
  methods: {
    onAlgosInputChange(recalculate) {
      if (this.globalState['LIQ'] === 0) {
        this.validate();
        return;
      }
      if (this.primaryAmount === null || this.primaryAmount === '') {
        this.secondaryAmount = null;
        return;
      }
      this.secondaryAmount = this.secondaryAsset.getAssetDisplayAmount(
        Math.trunc(
          (this.primaryAsset.getRawAssetAmount(this.primaryAmount) / this.globalExchangeRate) * this.currentPair.ratio
        )
      );
      if (!this.isDifferenceCorrect && recalculate) {
        this.primaryAmount = this.primaryAsset.getAssetDisplayAmount(
          Math.trunc(
            (this.globalExchangeRate * this.secondaryAsset.getRawAssetAmount(this.secondaryAmount)) /
              this.currentPair.ratio
          )
        );
      }
      this.validate();
    },
    onAssetInputChange(recalculate) {
      if (this.globalState['LIQ'] === 0) {
        this.validate();
        return;
      }
      if (this.secondaryAmount === null || this.secondaryAmount === '') {
        this.primaryAmount = null;
        return;
      }
      this.primaryAmount = this.primaryAsset.getAssetDisplayAmount(
        Math.trunc(
          (this.globalExchangeRate * this.secondaryAsset.getRawAssetAmount(this.assetAmount)) /
            this.currentPair.ratio
        )
      );
      if (!this.isDifferenceCorrect && recalculate) {
        this.assetAmount = this.secondaryAsset.getAssetDisplayAmount(
          Math.trunc(
            (this.primaryAsset.getRawAssetAmount(this.primaryAmount) / this.globalExchangeRate) * this.currentPair.ratio
          )
        );
      }
      this.validate();
    },
    validate() {
      let error = null;
      error = getInputError(this.secondaryAmount, this.secondaryAsset.decimalPoints, this.secondaryAsset.assetName);
      error =
        error ||
        getInputError(this.primaryAmount, this.primaryAsset.decimalPoints, this.primaryAsset.assetName);
      if (
        !error &&
        !this.isDifferenceCorrect &&
        this.globalState['LIQ'] > 0
      ) {
        error = 'Invalid exchange rate';
      }
      this.error = error;
      this.$forceUpdate();
      return !error;
    },
    async onAddLiquidity() {
      const accountAddress = this.rawStore.account;
      await this.waitForAction(() =>
        this.rawStore.serviceInstance.addLiquidity(accountAddress, this.primaryAsset.getRawAssetAmount(this.primaryAmount), this.secondaryAsset.getRawAssetAmount(this.secondaryAmount))
      );
      this.primaryAmount = null;
      this.secondaryAmount = null;
    },
  },
};
</script>
