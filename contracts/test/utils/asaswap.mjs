import { getProgram, stringToBytes } from '@algorand-builder/algob';
import { SignType, TransactionType } from '@algorand-builder/runtime/build/types.js';


class AsaswapManager {
  constructor(runtime, creator, assetId) {
    this.creator = creator;
    this.runtime = runtime;
    this.assetId = assetId;
    this.program = getProgram('state.py');

    this.creationArgs = [
      `int:${assetId}`,
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
    this.runtime.optIntoASA(this.assetId, this.escrow.address, {}); // opt-in tx doesn't work
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
        assetID: this.assetId,
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

  addLiquidity(fromAccount, escrowAddress, assetAmount, microAlgosAmount, assetId = null) {
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
        assetID: assetId || this.assetId,
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

  assetSwap(fromAccount, escrowAddress, assetAmount, assetId = null) {
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
        assetID: assetId || this.assetId,
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

  algoSwap(fromAccount, escrowAddress, microAlgosAmount) {
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
        amountMicroAlgos: microAlgosAmount,
        payFlags: {
          totalFee: 1000,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }

  withdraw(sender, assetAmount, microAlgosAmount, assetFee = 1000, algoFee = 1000) {
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
        amount: assetAmount,
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
        amountMicroAlgos: microAlgosAmount,
        payFlags: {
          totalFee: algoFee,
        },
      },
    ];
    this.runtime.executeTx(txGroup, this.program, []);
  }
}

export default AsaswapManager;
