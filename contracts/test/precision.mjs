/* globals describe, it */

import chai from 'chai';
import { ALGOS_TO_ASA, ASA_TO_ASA, AsaswapManager } from './utils/asaswap.mjs';
import { configureTest } from './base.mjs';
import { fundAccounts, setupAssets } from './utils/assets.mjs';
import { Runtime, StoreAccount } from '@algorand-builder/runtime';
import { USR_A_BAL, USR_B_BAL } from '../common/constants.js';

const { assert } = chai;

const MAX_INT = Math.floor(2**42);

[ASA_TO_ASA, ALGOS_TO_ASA].forEach(function (contractType) {
  describe(`${contractType} Precision Tests`, function () {
    configureTest.call(this, contractType);

    this.beforeEach(() => {
      this.master = new StoreAccount(MAX_INT * 10e6);
      this.creator = new StoreAccount(this.minBalance);
      this.swapper = new StoreAccount(MAX_INT * 10e6);
      this.runtime = new Runtime([this.master, this.creator, this.swapper]);
      this.assetIds = setupAssets(this.runtime, this.master);
      fundAccounts(this.runtime, this.master, [this.master, this.swapper], this.assetIds, MAX_INT);
      this.asaswap = new AsaswapManager(this.runtime, this.creator, this.assetIds, contractType);
    });

    it('overflow in liquidity transactions', () => {
      this.asaswap.setupApplicationWithEscrow(this.master);
      this.asaswap.optIn(this.master.address);

      this.asaswap.addLiquidity(this.master.account, this.asaswap.getEscrowAddress(), MAX_INT, Math.floor(MAX_INT/2));
      this.asaswap.removeLiquidity(this.master.account, MAX_INT);
      this.asaswap.withdraw(this.master, this.getLocalNumber(this.master.address, USR_A_BAL), this.getLocalNumber(this.master.address, USR_B_BAL));

      this.asaswap.addLiquidity(this.master.account, this.asaswap.getEscrowAddress(), Math.floor(MAX_INT/2), MAX_INT);
      this.asaswap.removeLiquidity(this.master.account, Math.floor(MAX_INT/2));
      this.asaswap.withdraw(this.master, this.getLocalNumber(this.master.address, USR_A_BAL), this.getLocalNumber(this.master.address, USR_B_BAL));
    });

    it('overflow in primary swap transactions', () => {
      this.asaswap.setupApplicationWithEscrow(this.master);
      this.asaswap.optIn(this.master.address);
      this.asaswap.addLiquidity(this.master.account, this.asaswap.getEscrowAddress(), MAX_INT, Math.floor(MAX_INT/2));
      this.asaswap.primaryAssetSwap(this.master.account, this.asaswap.getEscrowAddress(), MAX_INT);
      this.asaswap.withdraw(this.master, this.getLocalNumber(this.master.address, USR_A_BAL), this.getLocalNumber(this.master.address, USR_B_BAL));
    });

    it('precision in primary swap transactions', () => {
      this.asaswap.setupApplicationWithEscrow(this.master);
      this.asaswap.optIn(this.master.address);
      this.asaswap.addLiquidity(this.master.account, this.asaswap.getEscrowAddress(), Math.floor(MAX_INT/10000), 3);
      this.asaswap.primaryAssetSwap(this.master.account, this.asaswap.getEscrowAddress(), Math.floor(MAX_INT/10000));
      assert.notEqual(this.getLocalNumber(this.master.address, USR_B_BAL), 0);
      this.asaswap.withdraw(this.master, this.getLocalNumber(this.master.address, USR_A_BAL), this.getLocalNumber(this.master.address, USR_B_BAL));
    });

    it('precision in secondary swap transactions', () => {
      this.asaswap.setupApplicationWithEscrow(this.master);
      this.asaswap.optIn(this.master.address);
      this.asaswap.addLiquidity(this.master.account, this.asaswap.getEscrowAddress(), 3, Math.floor(MAX_INT/10000));
      this.asaswap.secondaryAssetSwap(this.master.account, this.asaswap.getEscrowAddress(), Math.floor(MAX_INT/10000));
      assert.notEqual(this.getLocalNumber(this.master.address, USR_A_BAL), 0);
      this.asaswap.withdraw(this.master, this.getLocalNumber(this.master.address, USR_A_BAL), this.getLocalNumber(this.master.address, USR_B_BAL));
    });
  });
});
