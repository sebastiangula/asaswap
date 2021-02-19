export function setupAssets(runtime, account) {
  account.addAsset(123, 'ASSET', {
    creator: 'addr-1',
    total: 10000000,
    decimals: 10,
    defaultFrozen: false,
    unitName: 'ASSET',
    name: 'ASSET',
    url: 'assetUrl',
    metadataHash: 'hash',
    manager: 'addr-1',
    reserve: 'addr-2',
    freeze: 'addr-3',
    clawback: 'addr-4'
  });
  account.addAsset(111, 'ANOTHER', {
    creator: 'addr-1',
    total: 10000000,
    decimals: 10,
    defaultFrozen: false,
    unitName: 'ASSET',
    name: 'ASSET',
    url: 'assetUrl',
    metadataHash: 'hash',
    manager: 'addr-1',
    reserve: 'addr-2',
    freeze: 'addr-3',
    clawback: 'addr-4'
  });
  account.addAsset(100, 'INVALID', {
    creator: 'addr-1',
    total: 10000000,
    decimals: 10,
    defaultFrozen: false,
    unitName: 'ASSET',
    name: 'ASSET',
    url: 'assetUrl',
    metadataHash: 'hash',
    manager: 'addr-1',
    reserve: 'addr-2',
    freeze: 'addr-3',
    clawback: 'addr-4'
  });
  runtime.store.assetDefs.set(123, account.address);
  runtime.store.assetDefs.set(111, account.address);
  runtime.store.assetDefs.set(100, account.address);

}

export function fundAccounts(runtime, fundingAccount, accounts) {
  accounts.forEach((account) => {
    runtime.optIntoASA(123, account.address, {});
    runtime.optIntoASA(111, account.address, {});
    runtime.optIntoASA(100, account.address, {});
    runtime.transferAsset({
      assetID: 123,
      fromAccount: fundingAccount.account,
      toAccountAddr: account.address,
      amount: 1000000,
      payFlags: {
        totalFee: 1000
      }
    });
    runtime.transferAsset({
      assetID: 111,
      fromAccount: fundingAccount.account,
      toAccountAddr: account.address,
      amount: 1000000,
      payFlags: {
        totalFee: 1000
      }
    });
    runtime.transferAsset({
      assetID: 100,
      fromAccount: fundingAccount.account,
      toAccountAddr: account.address,
      amount: 1000000,
      payFlags: {
        totalFee: 1000
      }
    });
  });
}
