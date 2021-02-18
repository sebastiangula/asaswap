import { ASSET_PAIRS } from '@/utils/assetPairs';

function getPair() {
  const storedPair = localStorage.getItem('pair');
  if (!ASSET_PAIRS[storedPair]) {
    localStorage.setItem('pair', Object.keys(ASSET_PAIRS)[0]);
    return Object.keys(ASSET_PAIRS)[0];
  }
  return storedPair;
}

export default function() {
  return {
    serviceInstance: null,
    connected: false,
    accounts: [],
    fetchedAccounts: false,
    account: localStorage.getItem('account'),
    accountData: null,
    applicationData: null,
    pendingUpdate: false,
    pendingAction: null,
    pendingActionMessage: null,
    currentPair: getPair(),
    changingPair: false,
  };
}
