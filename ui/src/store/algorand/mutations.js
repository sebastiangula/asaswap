export function SET_SERVICE_INSTANCE(state, instance) {
  state.serviceInstance = instance;
}

export function SET_CONNECTED(state, isConnected) {
  state.connected = isConnected;
}

export function SET_ACCOUNTS(state, accounts) {
  state.accounts = accounts;
  state.fetchedAccounts = true;
}

export function SET_ACCOUNT(state, account) {
  state.account = account;
  if (account) {
    localStorage.setItem('account', account);
  } else {
    localStorage.removeItem('account');
  }
}

export function SET_ACCOUNT_DATA(state, accountData) {
  state.accountData = accountData;
}

export function SET_APPLICATION_DATA(state, applicationData) {
  state.applicationData = applicationData;
}

export function SET_PENDING_UPDATE(state, pendingUpdate) {
  state.pendingUpdate = pendingUpdate;
}

export function SET_PENDING_ACTION(state, pendingAction) {
  state.pendingAction = pendingAction;
}

export function SET_PENDING_ACTION_MESSAGE(state, pendingActionMessage) {
  state.pendingActionMessage = pendingActionMessage;
}

export function SET_CURRENT_PAIR(state, pairKey) {
  state.currentPair = pairKey;
  if (pairKey) {
    localStorage.setItem('pair', pairKey);
  }
}

export function SET_CHANGING_PAIR(state, changingPair) {
  state.changingPair = changingPair;
}
