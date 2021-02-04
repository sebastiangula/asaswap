/* globals describe, it */

import {
  addressToPk,
  getProgram,
  stringToBytes,
} from '@algorand-builder/algob';
import { Runtime, StoreAccount } from '@algorand-builder/runtime';
import { TransactionType, SignType } from '@algorand-builder/runtime/build/types.js';
import { ERRORS } from '@algorand-builder/runtime/build/errors/errors-list.js';
import chai from 'chai';
const { assert } = chai;

import { expectTealError } from './utils/errors.mjs';

const minBalance = 10e6; // 10 ALGO's

describe('Asaswap Tests', function () {
  let master;
  let creator;
  let escrow;
  let swapper;
  const program = getProgram('state.py');

  let runtime;
  let flags;
  let applicationId;
  let lsig;

  const getGlobal = (key) => runtime.getGlobalState(applicationId, key);
  const getLocal = (accountAddr, key) => runtime.getLocalState(applicationId, accountAddr, key);
  const setupApplication = () => {
    const creationFlags = Object.assign({}, flags);
    applicationId = runtime.addApp({ ...creationFlags, appArgs: creationArgs }, {}, program);
    runtime.store.assetDefs.set(123, master.address);
  };
  const setupEscrow = () => {
    const escrowProg = getProgram('escrow.py', { app_id: applicationId });
    lsig = runtime.getLogicSig(escrowProg, []);
    const escrowAddress = lsig.address();
    escrow = runtime.getAccount(escrowAddress);
  };
  const setEscrow = (address) => {
    let appArgs = [stringToBytes('UPDATE')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: creator.account,
        appId: applicationId,
        appArgs: appArgs,
        accounts: [address],
        payFlags: { totalFee: 1000 },
      }
    ];
    runtime.executeTx(txGroup, program, []);
  };
  const optIn = (address) => {
    runtime.optInToApp(address, applicationId, {}, {}, program);
  };
  const addLiquidity = (fromAccount, escrowAddress, assetAmount, microAlgosAmount, assetId=123) => {
    let appArgs = [stringToBytes('ADD_LIQUIDITY')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: applicationId,
        appArgs: appArgs,
        payFlags: { totalFee: 1000 },
      },
      {
        type: TransactionType.TransferAsset,
        assetID: assetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: assetAmount,
        payFlags: { 
          totalFee: 1000,
        },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amountMicroAlgos: microAlgosAmount,
        payFlags: { 
          totalFee: 1000,
        },
      }
    ];
    runtime.executeTx(txGroup, program, []);
  };
  const removeLiquidity = (fromAccount, amount) => {
    let appArgs = [stringToBytes('REMOVE_LIQUIDITY'), `int:${amount}`];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: applicationId,
        appArgs: appArgs,
        payFlags: { totalFee: 1000 },
      }
    ];
    runtime.executeTx(txGroup, program, []);
  };
  const setupApplicationWithEscrow = () => {
    setupApplication();
    setEscrow(escrow.address);
  };
  const assetSwap = (fromAccount, escrowAddress, assetAmount, assetId=123) => {
    let appArgs = [stringToBytes('SWAP')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: applicationId,
        appArgs: appArgs,
        payFlags: { totalFee: 1000 },
      },
      {
        type: TransactionType.TransferAsset,
        assetID: assetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: assetAmount,
        payFlags: { 
          totalFee: 1000,
        },
      },
    ];
    runtime.executeTx(txGroup, program, []);
  };
  const algoSwap = (fromAccount, escrowAddress, microAlgosAmount) => {
    let appArgs = [stringToBytes('SWAP')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: applicationId,
        appArgs: appArgs,
        payFlags: { totalFee: 1000 },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amountMicroAlgos: microAlgosAmount,
        payFlags: { 
          totalFee: 1000,
        },
      },
    ];
    runtime.executeTx(txGroup, program, []);
  };
  const withdraw = (sender, assetAmount, microAlgosAmount) => {
    let appArgs = [stringToBytes('WITHDRAW')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: sender.account,
        appId: applicationId,
        appArgs: appArgs,
        payFlags: { totalFee: 1000 },
      },
      {
        type: TransactionType.TransferAsset,
        assetID: 123,
        sign: SignType.LogicSignature,
        lsig: lsig,
        fromAccount: escrow.account,
        toAccountAddr: sender.address,
        amount: assetAmount,
        payFlags: { 
          totalFee: 1000,
        },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.LogicSignature,
        lsig: lsig,
        fromAccount: escrow.account,
        toAccountAddr: sender.address,
        amountMicroAlgos: microAlgosAmount,
        payFlags: { 
          totalFee: 1000,
        },
      },
    ];
    runtime.executeTx(txGroup, program, []);
  };

  this.beforeEach(() => {
    master = new StoreAccount(1000e6);
    creator = new StoreAccount(minBalance);
    escrow = new StoreAccount(minBalance);
    swapper = new StoreAccount(minBalance);
    master.createdAssets[1] = {
      creator: 'addr-1',
      total: 10000,
      decimals: 10,
      'default-frozen': 'false',
      'unit-name': 'AD',
      name: 'ASSETAD',
      url: 'assetUrl',
      'metadata-hash': 'hash',
      manager: 'addr-1',
      reserve: 'addr-2',
      freeze: 'addr-3',
      clawback: 'addr-4'
    };
    runtime = new Runtime([master, creator, escrow, swapper]);

    flags = {
      sender: creator.account,
      localInts: 3,
      localBytes: 0,
      globalInts: 4,
      globalBytes: 2
    };
  });

  const creationArgs = [
    'int:123',
  ];

  it('throws errors after trying to remove liquidity bigger than the balance', () => {
    setupApplicationWithEscrow();
    optIn(master.address);

    expectTealError(
      () => removeLiquidity(master.account, 8000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    addLiquidity(master.account, escrow.address, 10, 7000000);
    expectTealError(
      () => removeLiquidity(master.account, 8000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws errors after trying to withdraw amount bigger than the balance', () => {
    setupApplicationWithEscrow();
    optIn(master.address);

    expectTealError(
      () => withdraw(master, 121, 0),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => withdraw(master, 0, 121),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => withdraw(master, 121, 121),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws errors after trying to withdraw amount different than the balance', () => {
    setupApplicationWithEscrow();
    optIn(master.address);

    addLiquidity(master.account, escrow.address, 6000000, 7000000);
    removeLiquidity(master.account, 7000000);

    assert.equal(getLocal(master.address, 'ALGOS_TO_WITHDRAW'), 7000000);
    assert.equal(getLocal(master.address, 'TOKENS_TO_WITHDRAW'), 6000000);
    assert.equal(getLocal(master.address, 'USER_LIQUIDITY_TOKENS'), 0);

    expectTealError(
      () => withdraw(master, 121, 121),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => withdraw(master, 6000000, 0),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => withdraw(master, 0, 7000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when deposit is made to invalid account', () => {
    setupApplicationWithEscrow();
    optIn(master.address);
    expectTealError(
      () => addLiquidity(master.account, swapper.address, 6000000, 7000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when deposit is made with invalid asset', () => {
    setupApplicationWithEscrow();
    optIn(master.address);
    expectTealError(
      () => addLiquidity(master.account, escrow.address, 6000000, 7000000, 111),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when swap is made with invalid asset', () => {
    setupApplicationWithEscrow();
    optIn(master.address);
    optIn(swapper.address);
    addLiquidity(master.account, escrow.address, 6000000, 7000000);
    expectTealError(
      () => assetSwap(swapper.account, escrow.address, 100, 111),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when swap is made with invalid account', () => {
    setupApplicationWithEscrow();
    optIn(master.address);
    optIn(swapper.address);
    addLiquidity(master.account, escrow.address, 6000000, 7000000);
    expectTealError(
      () => assetSwap(swapper.account, master.address, 100, 111),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('successfully swaps and withdraws', () => {
    const creatorPk = addressToPk(creator.address);

    // setup application
    setupApplication();

    assert.isDefined(applicationId);
    assert.equal(getGlobal('ASSET_IDX'), 123);
    assert.equal(getGlobal('TOTAL_LIQUIDITY_TOKENS'), 0);
    assert.equal(getGlobal('ALGOS_BALANCE'), 0);
    assert.equal(getGlobal('TOKENS_BALANCE'), 0);
    assert.equal(getGlobal('ESCROW_ADDR'), undefined);
    assert.deepEqual(getGlobal('CREATOR_ADDR'), creatorPk);

    // setup escrow account
    setupEscrow();
  
    // update application with correct escrow account address
    setEscrow(escrow.address);

    // verify escrow storage
    assert.deepEqual(getGlobal('ESCROW_ADDR'), addressToPk(escrow.address));
    assert.equal(getGlobal('ASSET_IDX'), 123);

    // opt-in and add liquidity
    optIn(master.address);
    addLiquidity(master.account, escrow.address, 6000000, 7000000);

    assert.equal(getGlobal('TOTAL_LIQUIDITY_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BALANCE'), 7000000);
    assert.equal(getGlobal('TOKENS_BALANCE'), 6000000);
    assert.equal(getLocal(master.address, 'ALGOS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(master.address, 'TOKENS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(master.address, 'USER_LIQUIDITY_TOKENS'), 7000000);

    // make an algo swap
    optIn(swapper.address);
    algoSwap(swapper.account, escrow.address, 1000000);

    assert.equal(getGlobal('TOTAL_LIQUIDITY_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BALANCE'), 8000000);
    assert.equal(getGlobal('TOKENS_BALANCE'), 5272500);
    assert.equal(getLocal(master.address, 'ALGOS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(master.address, 'TOKENS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(master.address, 'USER_LIQUIDITY_TOKENS'), 7000000);
    assert.equal(getLocal(swapper.address, 'ALGOS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(swapper.address, 'TOKENS_TO_WITHDRAW'), 727500);
    assert.equal(getLocal(swapper.address, 'USER_LIQUIDITY_TOKENS'), 0);

    // withdraw tokens
    withdraw(swapper, 727500, 0);
    assert.equal(getGlobal('TOTAL_LIQUIDITY_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BALANCE'), 7999000);
    assert.equal(getGlobal('TOKENS_BALANCE'), 5272500);
    assert.equal(getLocal(swapper.address, 'ALGOS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(swapper.address, 'TOKENS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(swapper.address, 'USER_LIQUIDITY_TOKENS'), 0);

    // make an asset swap
    assetSwap(master.account, escrow.address, 100);

    assert.equal(getGlobal('TOTAL_LIQUIDITY_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BALANCE'), 6527500);
    assert.equal(getGlobal('TOKENS_BALANCE'), 5272600);
    assert.equal(getLocal(master.address, 'ALGOS_TO_WITHDRAW'), 1471500);
    assert.equal(getLocal(master.address, 'TOKENS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(master.address, 'USER_LIQUIDITY_TOKENS'), 7000000);
    assert.equal(getLocal(swapper.address, 'ALGOS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(swapper.address, 'TOKENS_TO_WITHDRAW'), 0);
    assert.equal(getLocal(swapper.address, 'USER_LIQUIDITY_TOKENS'), 0);
  
    // withdraw algos
    withdraw(master, 0, 1471500);
  });
});
