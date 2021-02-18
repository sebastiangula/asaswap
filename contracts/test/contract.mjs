/* globals describe, it */

import { addressToPk } from '@algorand-builder/algob';
import { Runtime, StoreAccount } from '@algorand-builder/runtime';
import { ERRORS } from '@algorand-builder/runtime/build/errors/errors-list.js';
import chai from 'chai';
import { expectTealError } from './utils/errors.mjs';
import AsaswapManager from './utils/asaswap.mjs';

const {assert} = chai;


describe('Asaswap Tests', function () {
  const minBalance = 10e6;
  let master = new StoreAccount(1000e6);
  let creator = new StoreAccount(minBalance);
  let swapper = new StoreAccount(minBalance);

  let runtime;
  let asaswap;

  const getGlobal = (key) => runtime.getGlobalState(asaswap.getApplicationId(), key);
  const getLocal = (accountAddr, key) => runtime.getLocalState(asaswap.getApplicationId(), accountAddr, key);

  this.beforeEach(() => {
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
    runtime = new Runtime([master, creator, swapper]);
    asaswap = new AsaswapManager(runtime, creator);
  });


  it('throws errors after trying to opt-in escrow after finishing setup', () => {
    asaswap.setupApplication(master);
    asaswap.deployEscrow();
    asaswap.addFundsToEscrow();
    asaswap.configureEscrowAddress(asaswap.getEscrowAddress());

    expectTealError(
      () => asaswap.escrowOptInToAsset(),
      ERRORS.TEAL.INVALID_TYPE
    );
  });

  it('throws errors after trying to remove liquidity bigger than the balance', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);

    expectTealError(
      () => asaswap.removeLiquidity(master.account, 8000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 10, 7000000);
    expectTealError(
      () => asaswap.removeLiquidity(master.account, 8000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws errors after trying to make empty withdrawal', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);

    expectTealError(
      () => asaswap.withdraw(master, 0, 0),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws errors after trying to withdraw amount bigger than the balance', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);

    expectTealError(
      () => asaswap.withdraw(master, 121, 0),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => asaswap.withdraw(master, 0, 121),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => asaswap.withdraw(master, 121, 121),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws errors after trying to withdraw amount different than the balance', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);

    asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 6000000, 7000000);
    asaswap.removeLiquidity(master.account, 7000000);

    assert.equal(getLocal(master.address, 'USR_ALGOS'), 6998000);
    assert.equal(getLocal(master.address, 'USR_ASA'), 6000000);
    assert.equal(getLocal(master.address, 'USR_LIQ'), 0);

    expectTealError(
      () => asaswap.withdraw(master, 121, 121),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => asaswap.withdraw(master, 6000000, 0),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => asaswap.withdraw(master, 0, 6998000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws errors after altering the transaction fee', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);

    asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 6000000, 7000000);
    asaswap.removeLiquidity(master.account, 6000000);

    assert.equal(getLocal(master.address, 'USR_ALGOS'), 5998000);
    assert.equal(getLocal(master.address, 'USR_ASA'), 5142857);
    assert.equal(getLocal(master.address, 'USR_LIQ'), 1000000);

    expectTealError(
      () => asaswap.withdraw(master, 5142857, 5998000, 10000, 1000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => asaswap.withdraw(master, 5142857, 5998000, 10000, 10000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
    expectTealError(
      () => asaswap.withdraw(master, 5142857, 5998000, 1000, 10000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when deposit is made to invalid account', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);
    expectTealError(
      () => asaswap.addLiquidity(master.account, swapper.address, 6000000, 7000000),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when deposit is made with invalid asset', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);
    expectTealError(
      () => asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 6000000, 7000000, 111),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when swap is made with invalid asset', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);
    asaswap.optIn(swapper.address);
    asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 6000000, 7000000);
    expectTealError(
      () => asaswap.assetSwap(swapper.account, asaswap.getEscrowAddress(), 100, 111),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('throws error when swap is made with invalid account', () => {
    asaswap.setupApplicationWithEscrow(master);
    asaswap.optIn(master.address);
    asaswap.optIn(swapper.address);
    asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 6000000, 7000000);
    expectTealError(
      () => asaswap.assetSwap(swapper.account, master.address, 100, 111),
      ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
    );
  });

  it('successfully swaps and withdraws', () => {
    const creatorPk = addressToPk(creator.address);

    // Setup application
    asaswap.setupApplication(master);

    assert.isDefined(asaswap.getApplicationId());
    assert.equal(getGlobal('ASSET_IDX'), 123);
    assert.equal(getGlobal('LIQ_TOKENS'), 0);
    assert.equal(getGlobal('ALGOS_BAL'), 0);
    assert.equal(getGlobal('ASA_BAL'), 0);
    assert.equal(getGlobal('ESCROW_ADDR'), undefined);
    assert.deepEqual(getGlobal('CREATOR_ADDR'), creatorPk);

    // Setup escrow account
    asaswap.setupEscrow();

    // Update application with correct escrow account address
    asaswap.configureEscrowAddress(asaswap.getEscrowAddress());

    // Verify escrow storage
    assert.deepEqual(getGlobal('ESCROW_ADDR'), addressToPk(asaswap.getEscrowAddress()));
    assert.equal(getGlobal('ASSET_IDX'), 123);

    // Opt-in and add liquidity
    asaswap.optIn(master.address);
    asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 6000000, 7000000);

    assert.equal(getGlobal('LIQ_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BAL'), 7000000);
    assert.equal(getGlobal('ASA_BAL'), 6000000);
    assert.equal(getLocal(master.address, 'USR_ALGOS'), 0);
    assert.equal(getLocal(master.address, 'USR_ASA'), 0);
    assert.equal(getLocal(master.address, 'USR_LIQ'), 7000000);

    // Make an algo swap
    asaswap.optIn(swapper.address);
    asaswap.algoSwap(swapper.account, asaswap.getEscrowAddress(), 1000000);

    assert.equal(getGlobal('LIQ_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BAL'), 8000000);
    assert.equal(getGlobal('ASA_BAL'), 5272500);
    assert.equal(getLocal(master.address, 'USR_ALGOS'), 0);
    assert.equal(getLocal(master.address, 'USR_ASA'), 0);
    assert.equal(getLocal(master.address, 'USR_LIQ'), 7000000);
    assert.equal(getLocal(swapper.address, 'USR_ALGOS'), 0);
    assert.equal(getLocal(swapper.address, 'USR_ASA'), 727500);
    assert.equal(getLocal(swapper.address, 'USR_LIQ'), 0);

    // Withdraw tokens
    asaswap.withdraw(swapper, 727500, 0);
    assert.equal(getGlobal('LIQ_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BAL'), 8000000);
    assert.equal(getGlobal('ASA_BAL'), 5272500);
    assert.equal(getLocal(swapper.address, 'USR_ALGOS'), 0);
    assert.equal(getLocal(swapper.address, 'USR_ASA'), 0);
    assert.equal(getLocal(swapper.address, 'USR_LIQ'), 0);

    // Make an asset swap
    asaswap.assetSwap(master.account, asaswap.getEscrowAddress(), 1000000);

    assert.equal(getGlobal('LIQ_TOKENS'), 7000000);
    assert.equal(getGlobal('ALGOS_BAL'), 6762855);
    assert.equal(getGlobal('ASA_BAL'), 6272500);
    assert.equal(getLocal(master.address, 'USR_ALGOS'), 1237145);
    assert.equal(getLocal(master.address, 'USR_ASA'), 0);
    assert.equal(getLocal(master.address, 'USR_LIQ'), 7000000);
    assert.equal(getLocal(swapper.address, 'USR_ALGOS'), 0);
    assert.equal(getLocal(swapper.address, 'USR_ASA'), 0);
    assert.equal(getLocal(swapper.address, 'USR_LIQ'), 0);

    // Withdraw algos
    asaswap.withdraw(master, 0, 1237145);
  });
});
