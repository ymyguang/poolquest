export const poolQuestHookAbi = [
  {
    type: 'function',
    name: 'getRun',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      {
        name: 'viewRun',
        type: 'tuple',
        components: [
          { name: 'active', type: 'bool' },
          { name: 'completed', type: 'bool' },
          { name: 'progress', type: 'uint8' },
          { name: 'startedAt', type: 'uint40' },
          { name: 'lastActionAt', type: 'uint40' },
          { name: 'dragonBoughtAt', type: 'uint40' },
          { name: 'holdUnlockAt', type: 'uint40' },
          { name: 'hintCount', type: 'uint8' },
          { name: 'actionCount', type: 'uint8' },
          { name: 'hintPenalty', type: 'int256' },
          { name: 'cursePenalty', type: 'int256' },
          { name: 'lpContributionScore', type: 'int256' },
          { name: 'finalScore', type: 'int256' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'getProgress',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function',
    name: 'latestFeedback',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }]
  }
] as const;
