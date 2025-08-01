export const vaultABI = [
  // ERC20 Functions (inherited through ERC4626)
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "symbol",  
    inputs: [],
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ type: "address", name: "account" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "amount" }
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "spender" }
    ],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "amount" }
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { type: "address", name: "from" },
      { type: "address", name: "to" },
      { type: "uint256", name: "amount" }
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "nonpayable"
  },

  // ERC4626 Functions
  {
    type: "function",
    name: "asset",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalAssets",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "convertToShares",
    inputs: [{ type: "uint256", name: "assets" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "convertToAssets",
    inputs: [{ type: "uint256", name: "shares" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "maxDeposit",
    inputs: [{ type: "address", name: "receiver" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "previewDeposit",
    inputs: [{ type: "uint256", name: "assets" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      { type: "uint256", name: "assets" },
      { type: "address", name: "receiver" }
    ],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "maxMint",
    inputs: [{ type: "address", name: "receiver" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "previewMint",
    inputs: [{ type: "uint256", name: "shares" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { type: "uint256", name: "shares" },
      { type: "address", name: "receiver" }
    ],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "maxWithdraw",
    inputs: [{ type: "address", name: "owner" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "previewWithdraw",
    inputs: [{ type: "uint256", name: "assets" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { type: "uint256", name: "assets" },
      { type: "address", name: "receiver" },
      { type: "address", name: "owner" }
    ],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "maxRedeem",
    inputs: [{ type: "address", name: "owner" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "previewRedeem",
    inputs: [{ type: "uint256", name: "shares" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "redeem",
    inputs: [
      { type: "uint256", name: "shares" },
      { type: "address", name: "receiver" },
      { type: "address", name: "owner" }
    ],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "nonpayable"
  },

  // Ownable Functions
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ type: "address", name: "newOwner" }],
    outputs: [],
    stateMutability: "nonpayable"
  },

  // UUPS Upgradeable Functions
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [{ type: "bytes32", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "upgradeTo",
    inputs: [{ type: "address", name: "newImplementation" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      { type: "address", name: "newImplementation" },
      { type: "bytes", name: "data" }
    ],
    outputs: [],
    stateMutability: "payable"
  },

  // Custom SuperlinkUSDVault Functions
  {
    type: "function",
    name: "initialize",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "userDepositTime",
    inputs: [{ type: "address", name: "" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "userPrincipal",
    inputs: [{ type: "address", name: "" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalPrincipal",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "currentAllocation",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tvlCap",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "USDC",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "USDT",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "superlendPool",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "uniswapRouter",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "uniswapQuoter",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "iguanaRouter",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "iguanaQuoter",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "canRebalance",
    inputs: [],
    outputs: [
      { type: "bool", name: "canRebal" },
      { type: "string", name: "reason" },
      { type: "address", name: "betterAsset" },
      { type: "uint256", name: "currentAPY" },
      { type: "uint256", name: "betterAPY" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "rebalance",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "claimFees",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "emergencyPause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setTvlCap",
    inputs: [{ type: "uint256", name: "newCap" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getBestSwapRoute",
    inputs: [
      { type: "address", name: "tokenIn" },
      { type: "address", name: "tokenOut" },
      { type: "uint256", name: "amountIn" }
    ],
    outputs: [
      {
        type: "tuple",
        name: "",
        components: [
          { type: "address", name: "router" },
          { type: "uint256", name: "expectedOut" },
          { type: "bytes", name: "routeData" },
          { type: "uint24", name: "fee" }
        ]
      }
    ],
    stateMutability: "nonpayable"
  },

  // Events
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "value", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { type: "address", name: "owner", indexed: true },
      { type: "address", name: "spender", indexed: true },
      { type: "uint256", name: "value", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { type: "address", name: "sender", indexed: true },
      { type: "address", name: "owner", indexed: true },
      { type: "uint256", name: "assets", indexed: false },
      { type: "uint256", name: "shares", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { type: "address", name: "sender", indexed: true },
      { type: "address", name: "receiver", indexed: true },
      { type: "address", name: "owner", indexed: true },
      { type: "uint256", name: "assets", indexed: false },
      { type: "uint256", name: "shares", indexed: false }
    ]
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { type: "address", name: "previousOwner", indexed: true },
      { type: "address", name: "newOwner", indexed: true }
    ]
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      { type: "address", name: "implementation", indexed: true }
    ]
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      { type: "uint8", name: "version", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Rebalanced",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "amount", indexed: false }
    ]
  },
  {
    type: "event",
    name: "FeesClaimed",
    inputs: [
      { type: "uint256", name: "amount", indexed: false }
    ]
  },
  {
    type: "event",
    name: "EmergencyPaused",
    inputs: []
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: []
  },
  {
    type: "event",
    name: "TvlCapUpdated",
    inputs: [
      { type: "uint256", name: "newCap", indexed: false }
    ]
  },

  // Errors
  {
    type: "error",
    name: "InsufficientDeposit",
    inputs: []
  },
  {
    type: "error",
    name: "TvlCapExceeded",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalLocked",
    inputs: []
  },
  {
    type: "error",
    name: "ContractPaused",
    inputs: []
  },
  {
    type: "error",
    name: "ContractNotPaused",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientSlippage",
    inputs: []
  },
  {
    type: "error",
    name: "NoFeesToClaim",
    inputs: []
  },
  {
    type: "error",
    name: "RebalanceNotProfitable",
    inputs: []
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ type: "address", name: "account" }]
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ type: "address", name: "owner" }]
  },
  {
    type: "error",
    name: "ERC1967InvalidImplementation",
    inputs: [{ type: "address", name: "implementation" }]
  },
  {
    type: "error",
    name: "ERC1967NonPayable",
    inputs: []
  },
  {
    type: "error",
    name: "FailedInnerCall",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall", 
    inputs: []
  },
  {
    type: "error",
    name: "ERC20InsufficientBalance",
    inputs: [
      { type: "address", name: "sender" },
      { type: "uint256", name: "balance" },
      { type: "uint256", name: "needed" }
    ]
  },
  {
    type: "error",
    name: "ERC20InvalidSender",
    inputs: [{ type: "address", name: "sender" }]
  },
  {
    type: "error",
    name: "ERC20InvalidReceiver",
    inputs: [{ type: "address", name: "receiver" }]
  },
  {
    type: "error",
    name: "ERC20InsufficientAllowance",
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "allowance" },
      { type: "uint256", name: "needed" }
    ]
  },
  {
    type: "error",
    name: "ERC20InvalidApprover",
    inputs: [{ type: "address", name: "approver" }]
  },
  {
    type: "error",
    name: "ERC20InvalidSpender",
    inputs: [{ type: "address", name: "spender" }]
  },
  {
    type: "error",
    name: "ERC4626ExceededMaxDeposit",
    inputs: [
      { type: "address", name: "receiver" },
      { type: "uint256", name: "assets" },
      { type: "uint256", name: "max" }
    ]
  },
  {
    type: "error",  
    name: "ERC4626ExceededMaxMint",
    inputs: [
      { type: "address", name: "receiver" },
      { type: "uint256", name: "shares" },
      { type: "uint256", name: "max" }
    ]
  },
  {
    type: "error",
    name: "ERC4626ExceededMaxWithdraw",
    inputs: [
      { type: "address", name: "owner" },
      { type: "uint256", name: "assets" },
      { type: "uint256", name: "max" }
    ]
  },
  {
    type: "error",
    name: "ERC4626ExceededMaxRedeem",
    inputs: [
      { type: "address", name: "owner" },
      { type: "uint256", name: "shares" },
      { type: "uint256", name: "max" }
    ]
  }
] as const;