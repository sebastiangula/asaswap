export function getMappedUserAssets(accountData) {
  const assets = accountData['assets'];
  return Object.assign({}, ...assets.map((value) => {
    return {
      [value['asset-id']]: value
    };
  }));
}

export function getMappedUserState(accountData, applicationId) {
  const appStates = accountData['apps-local-state'];
  const statesPerApp = Object.assign({}, ...appStates.map(value => {
    return {
      [value.id]: value
    };
  }));
  const ourAppState = statesPerApp[applicationId];
  if (!ourAppState) {
    return {};
  }
  const keyValues = ourAppState['key-value'];
  return Object.assign({}, ...keyValues.map(rawValue => {
    const key = atob(rawValue.key);
    let value;
    if (rawValue.value.type === 1) {
      value = rawValue.value.bytes;
    } else if (rawValue.value.type === 2) {
      value = Number(rawValue.value.uint);
    }
    return {
      [key]: value
    };
  }));
}

export function getMappedGlobalState(applicationData) {
  const keyValues = applicationData['params']['global-state'];
  return Object.assign({}, ...keyValues.map(rawValue => {
    const key = atob(rawValue.key);
    let value;
    if (rawValue.value.type === 1) {
      value = rawValue.value.bytes;
    } else if (rawValue.value.type === 2) {
      value = Number(rawValue.value.uint);
    }
    return {
      [key]: value
    };
  }));
}
