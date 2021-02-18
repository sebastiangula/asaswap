export const ALGORAND_LEDGER = 'TestNet';

export const ASSET_PAIRS = {
  'ALGOS/USDTG': {
    primaryAsset: {
      assetName: 'Algos',
      assetIndex: null,
      decimalPoints: 6,
      ratio: 10 ** 6,
    },
    secondaryAsset: {
      assetName: 'USDTG',
      assetIndex: 14075549,
      decimalPoints: 2,
      ratio: 10 ** 2,
    },
    ratioDecimalPoints: 6,
    ratio: 10 ** 6,
    applicationId: 14180882,
    escrowAddress: '47ARPIDTJJGP2ZEBSJASYK4TB7WJCC3FPR3MB24HMQM3POPJXKQYWM2CNM',
    compiledEscrow: 'AiAHAgMEksThBgYAASYCDFNFVFVQX0VTQ1JPVwhXSVRIRFJBVzIEIhJAAA8yBCMSQAAyMgQkEkAAfgAzABglEjMAECEEEhA3ABoAKBIQMwEQJBIQMwESIQUSEEAAAQAhBkNCAKMzABglEjMAECEEEhA3ABoAKRIQMwEQJBIQMwIQIQYSMwIQJBIREDMBATIAEhAzAgEyABIQMwESIQUNMwIIIQUNETMCEiEFDREQQAABACEGQ0IAUDMAGCUSMwAQIQQSEDcAGgApEhAzARAkEhAzAhAhBhIzAhAkEhEQMwEBMgASEDMCATIAEhAzARIhBQ0zAgghBQ0RMwISIQUNERBAAAEAIQZD',
    type: 'ALGOS_TO_ASA',
    feePercentage: 3
  },
  'TOX/USDTG': {
    primaryAsset: {
      assetName: 'TOX',
      assetIndex: 14098899,
      decimalPoints: 3,
      ratio: 10 ** 3,
    },
    secondaryAsset: {
      assetName: 'USDTG',
      assetIndex: 14075549,
      decimalPoints: 2,
      ratio: 10 ** 2,
    },
    ratioDecimalPoints: 6,
    ratio: 10 ** 6,
    applicationId: 14180700,
    escrowAddress: 'DC7IWWGTSR2WLITIEW4ZYR5BEEFFAYCKOQHKPPCB7BXNGYYP4EMI6TZKYU',
    compiledEscrow: 'AiAHAgME3MLhBgYAASYCDFNFVFVQX0VTQ1JPVwhXSVRIRFJBVzIEIhJAAA8yBCMSQAAyMgQkEkAAfgAzABglEjMAECEEEhA3ABoAKBIQMwEQJBIQMwESIQUSEEAAAQAhBkNCAKMzABglEjMAECEEEhA3ABoAKRIQMwEQJBIQMwIQIQYSMwIQJBIREDMBATIAEhAzAgEyABIQMwESIQUNMwIIIQUNETMCEiEFDREQQAABACEGQ0IAUDMAGCUSMwAQIQQSEDcAGgApEhAzARAkEhAzAhAhBhIzAhAkEhEQMwEBMgASEDMCATIAEhAzARIhBQ0zAgghBQ0RMwISIQUNERBAAAEAIQZD',
    type: 'ASA_TO_ASA',
    feePercentage: 3
  }
};
