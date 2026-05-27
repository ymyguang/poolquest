export const poolQuestRouterAbi = [
  {
    type: 'function',
    name: 'claimDemoFunds',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'enterRun',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'donate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'addDemoLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'qusdAmount', type: 'uint256' },
      { name: 'dragonAmount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'swapDemo',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'buyDragon', type: 'bool' },
      { name: 'amountIn', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'claimHold',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'askHint',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'level', type: 'uint8' }],
    outputs: [
      { name: 'feeQusd', type: 'uint256' },
      { name: 'penalty', type: 'int256' }
    ]
  }
] as const;
