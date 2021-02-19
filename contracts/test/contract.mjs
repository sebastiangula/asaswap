/* globals describe, it */

import { addressToPk } from '@algorand-builder/algob';
import { Runtime, StoreAccount } from '@algorand-builder/runtime';
import { RUNTIME_ERRORS } from '@algorand-builder/runtime/build/errors/errors-list.js';
import chai from 'chai';
import { expectTealError } from './utils/errors.mjs';
import {AsaswapManager, ASA_TO_ASA, ALGOS_TO_ASA} from './utils/asaswap.mjs';
import { setupAssets, fundAccounts } from './utils/assets.mjs';

const { assert } = chai;

[ASA_TO_ASA, ALGOS_TO_ASA].forEach(function (contractType) {
  describe(`${contractType} Tests`, function () {
    const minBalance = 10e6;
    let master;
    let creator;
    let swapper;

    let runtime;
    let asaswap;

    const getGlobal = (key) => runtime.getGlobalState(asaswap.getApplicationId(), key);
    const getLocal = (accountAddr, key) => runtime.getLocalState(asaswap.getApplicationId(), accountAddr, key);

    this.beforeEach(() => {
      master = new StoreAccount(1000e6);
      creator = new StoreAccount(minBalance);
      swapper = new StoreAccount(minBalance);
      runtime = new Runtime([master, creator, swapper]);
      setupAssets(runtime, master);
      fundAccounts(runtime, master, [master, creator, swapper]);
      asaswap = new AsaswapManager(runtime, creator, 111, 123, contractType);
    });

    it('throws errors after trying to opt-in escrow after finishing setup', () => {
      asaswap.setupApplication(master);
      asaswap.deployEscrow();
      asaswap.addFundsToEscrow();
      asaswap.configureEscrowAddress(asaswap.getEscrowAddress());

      expectTealError(
        () => asaswap.escrowOptInToAsset(),
        RUNTIME_ERRORS.TEAL.INVALID_TYPE
      );
    });

    it('throws errors after trying to remove liquidity bigger than the balance', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);

      expectTealError(
        () => asaswap.removeLiquidity(master.account, 8000000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 10);
      expectTealError(
        () => asaswap.removeLiquidity(master.account, 8000000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws errors after trying to make empty withdrawal', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);

      expectTealError(
        () => asaswap.withdraw(master, 0, 0),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws errors after trying to withdraw amount bigger than the balance', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);

      expectTealError(
        () => asaswap.withdraw(master, 121, 0),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      expectTealError(
        () => asaswap.withdraw(master, 0, 121),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      expectTealError(
        () => asaswap.withdraw(master, 121, 121),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws errors after trying to withdraw amount different than the balance', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);

      asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 6000000);
      asaswap.removeLiquidity(master.account, 7000000);

      assert.equal(getLocal(master.address, 'USR_A'), 7000000);
      assert.equal(getLocal(master.address, 'USR_B'), 6000000);
      assert.equal(getLocal(master.address, 'USR_LIQ'), 0);

      expectTealError(
        () => asaswap.withdraw(master, 121, 121),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      expectTealError(
        () => asaswap.withdraw(master, 0, 6000000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      expectTealError(
        () => asaswap.withdraw(master, 7000000, 0),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws errors after altering the transaction fee', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);

      asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 6000000);
      asaswap.removeLiquidity(master.account, 6000000);

      assert.equal(getLocal(master.address, 'USR_A'), 6000000);
      assert.equal(getLocal(master.address, 'USR_B'), 5142857);
      assert.equal(getLocal(master.address, 'USR_LIQ'), 1000000);

      expectTealError(
        () => asaswap.withdraw(master, 6000000, 5142857, 10000, 1000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      expectTealError(
        () => asaswap.withdraw(master, 6000000, 5142857, 10000, 10000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
      expectTealError(
        () => asaswap.withdraw(master, 6000000, 5142857, 1000, 10000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws error when deposit is made to invalid account', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);
      expectTealError(
        () => asaswap.addLiquidity(master.account, swapper.address, 7000000, 6000000),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws error when deposit is made with invalid asset', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);
      expectTealError(
        () => asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 6000000, {
          secondaryAssetId: 100
        }),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws error when swap is made with invalid asset', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);
      asaswap.optIn(swapper.address);
      asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 6000000);
      expectTealError(
        () => asaswap.secondaryAssetSwap(swapper.account, asaswap.getEscrowAddress(), 100, {
          secondaryAssetId: 100
        }),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('throws error when swap is made with invalid account', () => {
      asaswap.setupApplicationWithEscrow(master);
      asaswap.optIn(master.address);
      asaswap.optIn(swapper.address);
      asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 6000000);
      expectTealError(
        () => asaswap.secondaryAssetSwap(swapper.account, master.address, 100),
        RUNTIME_ERRORS.TEAL.TEAL_ENCOUNTERED_ERR
      );
    });

    it('successfully swaps and withdraws', () => {
      const creatorPk = addressToPk(creator.address);

      // Setup application
      asaswap.setupApplication(master);

      assert.isDefined(asaswap.getApplicationId());
      if (contractType === ASA_TO_ASA) {
        assert.equal(getGlobal('A_IDX'), 111);
      }
      assert.equal(getGlobal('B_IDX'), 123);
      assert.equal(getGlobal('LIQ'), 0);
      assert.equal(getGlobal('A'), 0);
      assert.equal(getGlobal('B'), 0);
      assert.equal(getGlobal('ESC'), undefined);
      assert.deepEqual(getGlobal('CRT'), creatorPk);

      // Setup escrow account
      asaswap.setupEscrow();

      // Update application with correct escrow account address
      asaswap.configureEscrowAddress(asaswap.getEscrowAddress());

      // Verify escrow storage
      assert.deepEqual(getGlobal('ESC'), addressToPk(asaswap.getEscrowAddress()));
      if (contractType === ASA_TO_ASA) {
        assert.equal(getGlobal('A_IDX'), 111);
      }
      assert.equal(getGlobal('B_IDX'), 123);

      // Opt-in and add liquidity
      asaswap.optIn(master.address);
      asaswap.addLiquidity(master.account, asaswap.getEscrowAddress(), 7000000, 6000000);

      assert.equal(getGlobal('LIQ'), 7000000);
      assert.equal(getGlobal('A'), 7000000);
      assert.equal(getGlobal('B'), 6000000);
      assert.equal(getLocal(master.address, 'USR_A'), 0);
      assert.equal(getLocal(master.address, 'USR_B'), 0);
      assert.equal(getLocal(master.address, 'USR_LIQ'), 7000000);

      // Make a primary asset swap
      asaswap.optIn(swapper.address);
      asaswap.primaryAssetSwap(swapper.account, asaswap.getEscrowAddress(), 1000000);

      assert.equal(getGlobal('LIQ'), 7000000);
      assert.equal(getGlobal('A'), 8000000);
      assert.equal(getGlobal('B'), 5272500);
      assert.equal(getLocal(master.address, 'USR_A'), 0);
      assert.equal(getLocal(master.address, 'USR_B'), 0);
      assert.equal(getLocal(master.address, 'USR_LIQ'), 7000000);
      assert.equal(getLocal(swapper.address, 'USR_A'), 0);
      assert.equal(getLocal(swapper.address, 'USR_B'), 727500);
      assert.equal(getLocal(swapper.address, 'USR_LIQ'), 0);

      // Withdraw tokens
      asaswap.withdraw(swapper, 0, 727500);
      assert.equal(getGlobal('LIQ'), 7000000);
      assert.equal(getGlobal('A'), 8000000);
      assert.equal(getGlobal('B'), 5272500);
      assert.equal(getLocal(swapper.address, 'USR_A'), 0);
      assert.equal(getLocal(swapper.address, 'USR_B'), 0);
      assert.equal(getLocal(swapper.address, 'USR_LIQ'), 0);

      // Make a secondary asset swap
      asaswap.secondaryAssetSwap(master.account, asaswap.getEscrowAddress(), 1000000);

      assert.equal(getGlobal('LIQ'), 7000000);
      assert.equal(getGlobal('A'), 6762855);
      assert.equal(getGlobal('B'), 6272500);
      assert.equal(getLocal(master.address, 'USR_A'), 1237145);
      assert.equal(getLocal(master.address, 'USR_B'), 0);
      assert.equal(getLocal(master.address, 'USR_LIQ'), 7000000);
      assert.equal(getLocal(swapper.address, 'USR_A'), 0);
      assert.equal(getLocal(swapper.address, 'USR_B'), 0);
      assert.equal(getLocal(swapper.address, 'USR_LIQ'), 0);

      // Withdraw primary asset
      asaswap.withdraw(master, 1237145, 0);
    });
  });
});
