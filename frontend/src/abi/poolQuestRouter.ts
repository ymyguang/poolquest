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
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'agentId', type: 'bytes32' },
      { name: 'creator', type: 'address' },
      { name: 'totalSteps', type: 'uint8' },
      { name: 'ruleHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'enterSelf',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'creator', type: 'address' },
      { name: 'totalSteps', type: 'uint8' },
      { name: 'ruleHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'donate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amountQusd', type: 'uint256' }],
    outputs: [{ name: 'delta', type: 'int256' }]
  },
  {
    type: 'function',
    name: 'addLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'qusdAmount', type: 'uint256' },
      { name: 'agentAmount', type: 'uint256' },
      { name: 'liquidityDelta', type: 'int256' }
    ],
    outputs: [{ name: 'delta', type: 'int256' }]
  },
  {
    type: 'function',
    name: 'removeLiquidity',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'liquidityDelta', type: 'int256' }],
    outputs: [{ name: 'delta', type: 'int256' }]
  },
  {
    type: 'function',
    name: 'swapBuy',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amountQusdIn', type: 'uint256' }],
    outputs: [{ name: 'delta', type: 'int256' }]
  },
  {
    type: 'function',
    name: 'swapSell',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amountAgentIn', type: 'uint256' }],
    outputs: [{ name: 'delta', type: 'int256' }]
  },
  {
    type: 'function',
    name: 'purchaseHint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'level', type: 'uint8' },
      { name: 'feeQusd', type: 'uint256' },
      { name: 'penalty', type: 'int256' }
    ],
    outputs: []
  }
] as const;
