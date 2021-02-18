import store from '@/store';
import eventBus from '@/utils/eventBus';

function InsufficientFunds() {
  return new Error('Insufficient Funds');
}

InsufficientFunds.prototype = Object.create(Error.prototype);

export function getInputError(value, decimalPoints, assetName) {
  if (Number(value) <= 0) {
    return 'Enter a valid amount';
  }
  if (Number(Number(value).toFixed(decimalPoints)) !== Number(value)) {
    if (decimalPoints) {
      return `${assetName} has ${decimalPoints} decimal points`;
    } else {
      return `${assetName} does not have decimal points`;
    }
  }
  return null;
}

export async function validateIfAccountCanAffordTxs(txs) {
  await store.dispatch('algorand/FETCH_ACCOUNT_DATA');
  const algoSpending = countAlgoSpending(txs);
  if (algoSpending > getAlgoBalance()) {
    emitInsufficientFundsError();
    throw InsufficientFunds();
  }
  const assetBalances = getAssetBalances();
  const assetSpendings = countAssetSpendings(txs);
  Object.keys(assetSpendings).forEach((assetIndex) => {
    let assetSpending = assetSpendings[assetIndex];
    if (assetSpending > assetBalances[assetIndex]) {
      emitInsufficientFundsError();
      throw InsufficientFunds();
    }
  });
}

function emitInsufficientFundsError() {
  eventBus.$emit('open-alert', {
    type: 'error',
    message: 'Insufficient funds'
  });
}

function getAlgoBalance() {
  return store.getters['algorand/algoBalance'];
}

function getAssetBalances() {
  return store.getters['algorand/assetBalances'];
}

function getAccountAddress() {
  return store.getters['algorand/rawStore'].account;
}

function countAlgoSpending(txs) {
  let totalSpending = 0;
  txs.forEach((tx) => {
    if (tx.from !== getAccountAddress()) {
      return;
    }
    totalSpending += tx.fee;
    if (tx.amount && tx.type !== 'axfer') {
      totalSpending += tx.amount;
    }
  });
  return totalSpending;
}

function countAssetSpendings(txs) {
  let spendings = {};
  txs.forEach((tx) => {
    if (tx.from !== getAccountAddress()) {
      return;
    }
    if (tx.amount && tx.type === 'axfer') {
      if (!spendings[tx.assetIndex]) {
        spendings[tx.assetIndex] = 0;
      }
      spendings[tx.assetIndex] += tx.amount;
    }
  });
  return spendings;
}
