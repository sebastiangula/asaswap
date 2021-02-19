// Original file: https://github.com/scale-it/algorand-builder/blob/master/examples/crowdfunding/scripts/createApp.js
/* globals module, require */

const { stringToBytes, updateSSC } = require('@algorand-builder/algob');
const { executeTransaction } = require('@algorand-builder/algob');
const { TransactionType, SignType } = require('@algorand-builder/runtime/build/types.js');

const ALGOS_TO_ASA = 'ALGOS_TO_ASA';
const ASA_TO_ASA = 'ASA_TO_ASA';

const SECONDARY_ASSET_INDEX = 14075549;
const PRIMARY_ASSET_INDEX = 14098899;
const CONTRACT_TYPE = ASA_TO_ASA;

// updateSSC doesn't support template parameters, edit them manually in state.py

async function run (runtimeEnv, deployer) {
  const masterAccount = deployer.accountsByName.get('master');

  // Initialize app arguments
  let appArgs;
  if (CONTRACT_TYPE === ALGOS_TO_ASA) {
    appArgs = [
      `int:${SECONDARY_ASSET_INDEX}`
    ];
  } else {
    appArgs = [
      `int:${SECONDARY_ASSET_INDEX}`,
      `int:${PRIMARY_ASSET_INDEX}`
    ];
  }

  // Create Application
  // Note: An Account can have maximum of 10 Applications.
  await deployer.ensureCompiled('state.py', true, {
    type: CONTRACT_TYPE
  });
  const res = await deployer.deploySSC(
    'state.py', // approval program
    'clear.py', // clear program
    {
      sender: masterAccount,
      localInts: 3,
      localBytes: 0,
      globalInts: CONTRACT_TYPE === ALGOS_TO_ASA ? 4 : 5,
      globalBytes: 2,
      appArgs: appArgs
    },
    {},
    {
      type: CONTRACT_TYPE
    }
  );
  const applicationID = res.appID;

  // Get escrow account address
  const escrowAccount = await deployer.loadLogic('escrow.py', [], { app_id: applicationID });
  console.log('Escrow Account Address:', escrowAccount.address());

  // Send funds for minimum escrow balance
  const algoTxnParams = {
    type: TransactionType.TransferAlgo,
    sign: SignType.SecretKey,
    fromAccount: masterAccount,
    toAccountAddr: escrowAccount.address(),
    amountMicroAlgos: CONTRACT_TYPE === ALGOS_TO_ASA ? 201000 : 304000,
    payFlags: {}
  };
  await executeTransaction(deployer, algoTxnParams);

  console.log('Opting-In For Escrow');
  let txnParams = [
    {
      type: TransactionType.CallNoOpSSC,
      sign: SignType.SecretKey,
      fromAccount: masterAccount,
      appId: applicationID,
      appArgs: [stringToBytes('SETUP_ESCROW')],
      payFlags: { totalFee: 1000 }
    },
    {
      type: TransactionType.TransferAsset,
      sign: SignType.LogicSignature,
      fromAccount: { addr: escrowAccount.address() },
      toAccountAddr: escrowAccount.address(),
      lsig: escrowAccount,
      assetAmount: 0,
      assetID: SECONDARY_ASSET_INDEX,
      payFlags: { totalFee: 1000 }
    }
  ];
  await executeTransaction(deployer, txnParams);
  if (CONTRACT_TYPE === ASA_TO_ASA) {
    txnParams = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: masterAccount,
        appId: applicationID,
        appArgs: [stringToBytes('SETUP_ESCROW')],
        payFlags: { totalFee: 1000 }
      },
      {
        type: TransactionType.TransferAsset,
        sign: SignType.LogicSignature,
        fromAccount: { addr: escrowAccount.address() },
        toAccountAddr: escrowAccount.address(),
        lsig: escrowAccount,
        assetAmount: 0,
        assetID: PRIMARY_ASSET_INDEX,
        payFlags: { totalFee: 1000 }
      }
    ];
    await executeTransaction(deployer, txnParams);
  }

  // Update application with escrow account
  // Note: that the code for the contract will not change.
  // The update operation links the two contracts.
  appArgs = [stringToBytes('UPDATE')];
  let updatedRes = await updateSSC(
    deployer,
    masterAccount,
    {}, // pay flags
    applicationID,
    'state.py',
    'clear.py',
    { 
      appArgs: appArgs,
      accounts: [escrowAccount.address()],
    }
  );

  console.log('Application Updated: ', updatedRes);
}

module.exports = { default: run };
