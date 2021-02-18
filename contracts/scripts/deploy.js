// Original file: https://github.com/scale-it/algorand-builder/blob/master/examples/crowdfunding/scripts/createApp.js
/* globals module, require */

const { stringToBytes, update } = require('@algorand-builder/algob');
const { executeTransaction } = require('@algorand-builder/algob');
const { TransactionType, SignType } = require('@algorand-builder/runtime/build/types.js');

const ASSET_INDEX = 123;

async function run (runtimeEnv, deployer) {
  const masterAccount = deployer.accountsByName.get('master');

  // Initialize app arguments
  let appArgs = [
    `int:${ASSET_INDEX}`
  ];

  // Create Application
  // Note: An Account can have maximum of 10 Applications.
  const res = await deployer.deploySSC(
    'state.py', // approval program
    'clear.py', // clear program
    {
      sender: masterAccount,
      localInts: 3,
      localBytes: 0,
      globalInts: 4,
      globalBytes: 2,
      appArgs: appArgs
    }, 
    {}
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
    amountMicroAlgos: 201000,
    payFlags: {}
  };
  await executeTransaction(deployer, algoTxnParams);

  console.log('Opting-In For Escrow');
  const txnParams = [
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
      assetID: ASSET_INDEX,
      payFlags: { totalFee: 1000 }
    }
  ];
  await executeTransaction(deployer, txnParams);

  // Update application with escrow account
  // Note: that the code for the contract will not change.
  // The update operation links the two contracts.
  appArgs = [stringToBytes('UPDATE')];
  let updatedRes = await update(
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
  console.log('Opting-In for Creator');
  await deployer.optInToSSC(masterAccount, applicationID, {}, {});
}

module.exports = { default: run };
