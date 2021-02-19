import { getProgram, stringToBytes } from '@algorand-builder/algob';
import { SignType, TransactionType } from '@algorand-builder/runtime/build/types.js';

export const ALGOS_TO_ASA = 'ALGOS_TO_ASA';
export const ASA_TO_ASA = 'ASA_TO_ASA';

export class AsaswapManager {
  constructor(runtime, creator, primaryAssetId = null, secondaryAssetId, type = ALGOS_TO_ASA) {
    if (type === ALGOS_TO_ASA) {
      const program = getProgram('state.py', { type: ALGOS_TO_ASA });
      this.manager = new AlgosAsaManager(runtime, creator, secondaryAssetId, program);
    } else {
      const program = getProgram('state.py', { type: ASA_TO_ASA });
      this.manager = new AsaToAsaManager(runtime, creator, primaryAssetId, secondaryAssetId, program);
    }
  }

  setupApplication() {
    return this.manager.setupApplication();
  }

  setupEscrow() {
    return this.manager.setupEscrow();
  }

  addFundsToEscrow() {
    return this.manager.addFundsToEscrow();
  }

  deployEscrow() {
    return this.manager.deployEscrow();
  }

  escrowOptInToAsset() {
    return this.manager.escrowOptInToAsset();
  }

  getEscrowAddress() {
    return this.manager.getEscrowAddress();
  }

  getApplicationId() {
    return this.manager.getApplicationId();
  }

  setupApplicationWithEscrow() {
    return this.manager.setupApplicationWithEscrow();
  }

  configureEscrowAddress(escrowAddress) {
    return this.manager.configureEscrowAddress(escrowAddress);
  }

  optIn(address) {
    return this.manager.optIn(address);
  }

  addLiquidity(fromAccount, escrowAddress, primaryAssetAmount, secondaryAssetAmount, params = {}) {
    return this.manager.addLiquidity(fromAccount, escrowAddress, primaryAssetAmount, secondaryAssetAmount, params);
  }

  removeLiquidity(fromAccount, amount) {
    return this.manager.removeLiquidity(fromAccount, amount);
  }

  secondaryAssetSwap(fromAccount, escrowAddress, assetAmount, params={}) {
    return this.manager.secondaryAssetSwap(fromAccount, escrowAddress, assetAmount, params);
  }

  primaryAssetSwap(fromAccount, escrowAddress, assetAmount) {
    return this.manager.primaryAssetSwap(fromAccount, escrowAddress, assetAmount);
  }

  withdraw(sender, primaryAssetAmount, secondaryAssetAmount, assetFee = 1000, algoFee = 1000) {
    return this.manager.withdraw(sender, primaryAssetAmount, secondaryAssetAmount, assetFee, algoFee);
  }
}

class AlgosAsaManager {
  constructor(runtime, creator, secondaryAssetId, program) {
    this.creator = creator;
    this.runtime = runtime;
    this.secondaryAssetId = secondaryAssetId;
    this.program = program;

    this.creationArgs = [
      `int:${secondaryAssetId}`
    ];
    this.flags = {
      sender: creator.account,
      localInts: 3,
      localBytes: 0,
      globalInts: 4,
      globalBytes: 2
    };
    this.escrow = null;
    this.applicationId = null;
    this.lSig = null;
  }

  setupApplication() {
    this.creationFlags = Object.assign({}, this.flags);
    this.applicationId = this.runtime.addApp({...this.creationFlags, appArgs: this.creationArgs}, {}, this.program);
  }

  setupEscrow() {
    this.deployEscrow();
    this.addFundsToEscrow();
    this.escrowOptInToAsset();
  }

  addFundsToEscrow() {
    let txGroup = [
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: this.creator.account,
        toAccountAddr: this.escrow.address,
        amountMicroAlgos: this.escrow.minBalance + 101000,
        payFlags: {
          totalFee: 1000,
        }
      }
    ];
    this.runtime.executeTx(txGroup, {}, []);
  }

  deployEscrow() {
    const escrowProg = getProgram('escrow.py', {app_id: this.applicationId});
    this.lSig = this.runtime.getLogicSig(escrowProg, []);
    const escrowAddress = this.lSig.address();
    this.escrow = this.runtime.getAccount(escrowAddress);
  }

  escrowOptInToAsset() {
    this.runtime.optIntoASA(this.secondaryAssetId, this.escrow.address, {}); // opt-in tx doesn't work
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: this.creator.account,
        appId: this.applicationId,
        appArgs: [stringToBytes('SETUP_ESCROW')],
        payFlags: {totalFee: 1000}
      },
      {
        type: TransactionType.TransferAsset,
        assetID: this.secondaryAssetId,
        sign: SignType.LogicSignature,
        lsig: this.lSig,
        fromAccount: this.escrow.account,
        toAccountAddr: this.escrow.address,
        amount: 0,
        payFlags: {
          totalFee: 1000,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  getEscrowAddress() {
    return this.escrow.address;
  }

  getApplicationId() {
    return this.applicationId;
  }

  setupApplicationWithEscrow() {
    this.setupApplication();
    this.setupEscrow();
    this.configureEscrowAddress(this.escrow.address);
  }

  configureEscrowAddress(escrowAddress) {
    let appArgs = [stringToBytes('UPDATE')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: this.creator.account,
        appId: this.applicationId,
        appArgs: appArgs,
        accounts: [this.creator.address, escrowAddress], // sender must be first
        payFlags: {totalFee: 1000},
      }
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  optIn(address) {
    this.runtime.optInToApp(address, this.applicationId, {}, {}, this.program);
  }

  addLiquidity(fromAccount, escrowAddress, primaryAssetAmount, secondaryAssetAmount, params = {}) {
    let appArgs = [stringToBytes('ADD_LIQUIDITY')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAsset,
        assetID: params['secondaryAssetId'] ? params['secondaryAssetId'] : this.secondaryAssetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: secondaryAssetAmount,
        payFlags: {
          totalFee: 1000,
        },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amountMicroAlgos: primaryAssetAmount,
        payFlags: {
          totalFee: 1000,
        },
      }
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  removeLiquidity(fromAccount, amount) {
    let appArgs = [stringToBytes('REMOVE_LIQUIDITY'), `int:${amount}`];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      }
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  secondaryAssetSwap(fromAccount, escrowAddress, assetAmount, params={}) {
    let appArgs = [stringToBytes('SWAP')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAsset,
        assetID: params['secondaryAssetId'] ? params['secondaryAssetId'] : this.secondaryAssetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: assetAmount,
        payFlags: {
          totalFee: 1000,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  // eslint-disable-next-line no-unused-vars
  primaryAssetSwap(fromAccount, escrowAddress, primaryAssetAmount) {
    let appArgs = [stringToBytes('SWAP')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amountMicroAlgos: primaryAssetAmount,
        payFlags: {
          totalFee: 1000,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  withdraw(sender, primaryAssetAmount, secondaryAssetAmount, assetFee = 1000, algoFee = 1000) {
    let appArgs = [stringToBytes('WITHDRAW')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: sender.account,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAsset,
        assetID: 123,
        sign: SignType.LogicSignature,
        lsig: this.lSig,
        fromAccount: this.escrow.account,
        toAccountAddr: sender.address,
        amount: secondaryAssetAmount,
        payFlags: {
          totalFee: assetFee,
        },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.LogicSignature,
        lsig: this.lSig,
        fromAccount: this.escrow.account,
        toAccountAddr: sender.address,
        amountMicroAlgos: primaryAssetAmount,
        payFlags: {
          totalFee: algoFee,
        },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: sender.account,
        toAccountAddr: this.escrow.address,
        amountMicroAlgos: 2000,
        payFlags: {
          totalFee: 1000,
        },
      }
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }
}

class AsaToAsaManager extends AlgosAsaManager {
  constructor(runtime, creator, primaryAssetId, secondaryAssetId, program) {
    super(runtime, creator, secondaryAssetId, program);
    this.flags = {
      sender: creator.account,
      localInts: 3,
      localBytes: 0,
      globalInts: 5,
      globalBytes: 2
    };
    this.primaryAssetId = primaryAssetId;
    this.secondaryAssetId = secondaryAssetId;
    this.creationArgs = [
      `int:${secondaryAssetId}`,
      `int:${primaryAssetId}`,
    ];
  }

  addLiquidity(fromAccount, escrowAddress, primaryAssetAmount, secondaryAssetAmount, params = {}) {
    let appArgs = [stringToBytes('ADD_LIQUIDITY')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAsset,
        assetID: params['secondaryAssetId'] ? params['secondaryAssetId'] : this.secondaryAssetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: secondaryAssetAmount,
        payFlags: {
          totalFee: 1000,
        },
      },
      {
        type: TransactionType.TransferAsset,
        assetID: params['primaryAssetId'] ? params['primaryAssetId'] : this.primaryAssetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: primaryAssetAmount,
        payFlags: {
          totalFee: 1000,
        },
      }
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  escrowOptInToAsset() {
    super.escrowOptInToAsset();
    this.runtime.optIntoASA(this.primaryAssetId, this.escrow.address, {}); // opt-in tx doesn't work
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: this.creator.account,
        appId: this.applicationId,
        appArgs: [stringToBytes('SETUP_ESCROW')],
        payFlags: {totalFee: 1000}
      },
      {
        type: TransactionType.TransferAsset,
        assetID: this.primaryAssetId,
        sign: SignType.LogicSignature,
        lsig: this.lSig,
        fromAccount: this.escrow.account,
        toAccountAddr: this.escrow.address,
        amount: 0,
        payFlags: {
          totalFee: 1000,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  withdraw(sender, primaryAssetAmount, secondaryAssetAmount, assetFee = 1000, algoFee = 1000) {
    let appArgs = [stringToBytes('WITHDRAW')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: sender.account,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAsset,
        assetID: this.secondaryAssetId,
        sign: SignType.LogicSignature,
        lsig: this.lSig,
        fromAccount: this.escrow.account,
        toAccountAddr: sender.address,
        amount: secondaryAssetAmount,
        payFlags: {
          totalFee: assetFee,
        },
      },
      {
        type: TransactionType.TransferAsset,
        assetID: this.primaryAssetId,
        sign: SignType.LogicSignature,
        lsig: this.lSig,
        fromAccount: this.escrow.account,
        toAccountAddr: sender.address,
        amount: primaryAssetAmount,
        payFlags: {
          totalFee: algoFee,
        },
      },
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: sender.account,
        toAccountAddr: this.escrow.address,
        amountMicroAlgos: 2000,
        payFlags: {
          totalFee: 1000,
        },
      }
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  addFundsToEscrow() {
    let txGroup = [
      {
        type: TransactionType.TransferAlgo,
        sign: SignType.SecretKey,
        fromAccount: this.creator.account,
        toAccountAddr: this.escrow.address,
        amountMicroAlgos: this.escrow.minBalance + 301000,
        payFlags: {
          totalFee: 1000,
        }
      }
    ];
    this.runtime.executeTx(txGroup, {}, []);
  }

  // eslint-disable-next-line no-unused-vars
  primaryAssetSwap(fromAccount, escrowAddress, primaryAssetAmount) {
    let appArgs = [stringToBytes('SWAP')];
    let txGroup = [
      {
        type: TransactionType.CallNoOpSSC,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        appId: this.applicationId,
        appArgs: appArgs,
        payFlags: {totalFee: 1000},
      },
      {
        type: TransactionType.TransferAsset,
        assetID: this.primaryAssetId,
        sign: SignType.SecretKey,
        fromAccount: fromAccount,
        toAccountAddr: escrowAddress,
        amount: primaryAssetAmount,
        payFlags: {
          totalFee: 1000,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }
}
