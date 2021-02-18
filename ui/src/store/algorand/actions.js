/* global AlgoSigner:readonly */

import AlgorandService from '@/services/algorandService';
import { ALGORAND_LEDGER } from '@/config';
import { isEqual } from 'lodash';
import { ASSET_PAIRS } from '@/utils/assetPairs';

export async function GET_SERVICE_INSTANCE({ commit, state, dispatch }) {
  if (typeof AlgoSigner !== 'undefined') {
    await commit('SET_SERVICE_INSTANCE', new AlgorandService(AlgoSigner, ALGORAND_LEDGER, ASSET_PAIRS[state.currentPair]));
    if (state.account) {
      await dispatch('CONNECT');
    }
  } else {
    window.setTimeout(() => dispatch('GET_SERVICE_INSTANCE'), 500);
  }
}

export async function CONNECT({ commit, state, dispatch }) {
  if (state.serviceInstance) {
    const signer = state.serviceInstance;
    await signer.connect();
    await commit('SET_CONNECTED', true);
    dispatch('FETCH_APPLICATION_DATA');
    dispatch('FETCH_ACCOUNTS');
    dispatch('FETCH_ACCOUNT_DATA');
  } else {
    commit('SET_SERVICE_INSTANCE', null);
    commit('SET_CONNECTED', false);
  }
}

export async function SELECT_ACCOUNT({ commit, state, dispatch }, { accountAddress }) {
  const accountIds = state.accounts.map(value => value.address);
  if (accountIds.indexOf(accountAddress) === -1) {
    return;
  }
  await commit('SET_ACCOUNT', accountAddress);
  await dispatch('FETCH_ACCOUNT_DATA', { accountAddress });
}

export async function FETCH_ACCOUNTS({ commit, state, dispatch }) {
  if (!state.connected) {
    return;
  }
  const accounts = await state.serviceInstance.getAccounts();
  await commit('SET_ACCOUNTS', accounts);

  const accountIds = state.accounts.map(value => value.address);
  if (!state.account && accounts.length > 0) {
    await dispatch('SELECT_ACCOUNT', { accountAddress: accounts[0].address });
  } else if (state.account && accountIds.indexOf(state.account) === -1) {
    await commit('SET_ACCOUNT', null);
  }
}

export async function FETCH_ACCOUNT_DATA({ commit, state, getters, dispatch }) {
  const accountAddress = state.account;
  if (!accountAddress) {
    return;
  }
  const prevState = Object.assign({}, getters.userState);
  const prevAssets = Object.assign({}, getters.userAssets);
  let accountData;
  try {
    accountData = await state.serviceInstance.getAccountData(accountAddress);
  } catch (e) {
    console.log(e);
    dispatch('FETCH_ACCOUNTS');
    return;
  }
  await commit('SET_ACCOUNT_DATA', accountData);
  if (state.pendingUpdate) {
    if (!isEqual(prevState, getters.userState)) {
      await commit('SET_PENDING_UPDATE', false);
    } else if (!isEqual(prevAssets, getters.userAssets))  {
      await commit('SET_PENDING_UPDATE', false);
    }
  }
}

export async function FETCH_APPLICATION_DATA({ state, commit }) {
  const applicationData = await AlgorandService.getApplicationData(ALGORAND_LEDGER, ASSET_PAIRS[state.currentPair].applicationId);
  commit('SET_APPLICATION_DATA', applicationData);
}

export async function OPT_IN({ state }) {
  const accountAddress = state.account;
  await state.serviceInstance.optInApp(accountAddress);
}

export async function SET_CURRENT_PAIR({ commit, dispatch, state }, { pairKey }) {
  if (state.changingPair) {
    return;
  }
  try {
    await commit('SET_CHANGING_PAIR', true);
    const pair = ASSET_PAIRS[pairKey];
    if (state.serviceInstance) {
      state.serviceInstance.setAssetPair(pair);
    }
    const splittedKey = pairKey.split('/');
    const reversedSplittedKey = [splittedKey[1], splittedKey[0]];
    const splittedOldKey = state.currentPair.split('/');
    await commit('SET_CURRENT_PAIR', pairKey);
    if (!isEqual(reversedSplittedKey, splittedOldKey)) {
      await commit('SET_APPLICATION_DATA', null);
      await commit('SET_ACCOUNT_DATA', null);
      dispatch('FETCH_APPLICATION_DATA');
      dispatch('FETCH_ACCOUNT_DATA');
    }
  } finally {
    await commit('SET_CHANGING_PAIR', false);
  }
}
