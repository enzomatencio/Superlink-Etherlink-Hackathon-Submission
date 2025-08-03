import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  Rebalanced as RebalancedEvent,
  FeesClaimed as FeesClaimedEvent,
  EmergencyPaused as EmergencyPausedEvent,
  Unpaused as UnpausedEvent,
  TvlCapUpdated as TvlCapUpdatedEvent,
  RouteSelected as RouteSelectedEvent,
  SuperlinkUSDVault
} from "../generated/SuperlinkUSDVault/SuperlinkUSDVault";

import {
  Vault,
  User,
  Deposit,
  Withdrawal,
  Rebalance,
  FeeClaim,
  EmergencyPause,
  Unpause,
  TvlCapUpdate,
  RouteSelection,
  DailyVaultSnapshot
} from "../generated/schema";

// Constants
const VAULT_ADDRESS = "0xe60009Dd8017CC4f300f16655E337B382A7AEAE6";
const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);

function getOrCreateVault(address: Address, block: BigInt, timestamp: BigInt): Vault {
  let vault = Vault.load(address.toHexString());
  
  if (!vault) {
    vault = new Vault(address.toHexString());
    vault.address = address.toHexString();
    vault.name = "Superlink USD Vault";
    vault.symbol = "supUSD";
    vault.totalAssets = ZERO_BI;
    vault.totalSupply = ZERO_BI;
    vault.totalPrincipal = ZERO_BI;
    vault.currentAllocation = "0x796ea11fa2dd751ed01b53c372ffdb4aaa8f00f9"; // USDC initially
    vault.paused = false;
    vault.tvlCap = BigInt.fromString("10000000000"); // 10,000 USDC
    vault.owner = "0x421892ff736134d95d177cd716324df1d240c295";
    
    // Initialize aggregated stats
    vault.totalDeposited = ZERO_BI;
    vault.totalWithdrawn = ZERO_BI;
    vault.totalFeesClaimed = ZERO_BI;
    vault.rebalanceCount = 0;
    vault.userCount = 0;
    
    vault.createdAt = timestamp;
    vault.updatedAt = timestamp;
  }
  
  return vault;
}

function getOrCreateUser(address: Address, vault: Vault, timestamp: BigInt): User {
  let user = User.load(address.toHexString());
  
  if (!user) {
    user = new User(address.toHexString());
    user.vault = vault.id;
    user.address = address.toHexString();
    user.shareBalance = ZERO_BI;
    user.assetBalance = ZERO_BI;
    user.principal = ZERO_BI;
    user.lastDepositTime = ZERO_BI;
    
    // Initialize aggregated stats
    user.totalDeposited = ZERO_BI;
    user.totalWithdrawn = ZERO_BI;
    user.depositCount = 0;
    user.withdrawalCount = 0;
    
    user.firstDepositAt = timestamp;
    user.lastActivityAt = timestamp;
    
    // Increment vault user count
    vault.userCount = vault.userCount + 1;
  }
  
  return user;
}

function updateVaultState(vault: Vault, block: BigInt): void {
  let contract = SuperlinkUSDVault.bind(Address.fromString(vault.address));
  
  // Try to read current state from contract
  let totalAssetsResult = contract.try_totalAssets();
  if (!totalAssetsResult.reverted) {
    vault.totalAssets = totalAssetsResult.value;
  }
  
  let totalSupplyResult = contract.try_totalSupply();
  if (!totalSupplyResult.reverted) {
    vault.totalSupply = totalSupplyResult.value;
  }
  
  let totalPrincipalResult = contract.try_totalPrincipal();
  if (!totalPrincipalResult.reverted) {
    vault.totalPrincipal = totalPrincipalResult.value;
  }
  
  let currentAllocationResult = contract.try_currentAllocation();
  if (!currentAllocationResult.reverted) {
    vault.currentAllocation = currentAllocationResult.value.toHexString();
  }
  
  let pausedResult = contract.try_paused();
  if (!pausedResult.reverted) {
    vault.paused = pausedResult.value;
  }
}

function updateUserState(user: User, vault: Vault): void {
  let contract = SuperlinkUSDVault.bind(Address.fromString(vault.address));
  
  // Update user's share balance
  let balanceResult = contract.try_balanceOf(Address.fromString(user.address));
  if (!balanceResult.reverted) {
    user.shareBalance = balanceResult.value;
  }
  
  // Calculate asset balance from shares
  let convertResult = contract.try_convertToAssets(user.shareBalance);
  if (!convertResult.reverted) {
    user.assetBalance = convertResult.value;
  }
  
  // Update user principal
  let principalResult = contract.try_userPrincipal(Address.fromString(user.address));
  if (!principalResult.reverted) {
    user.principal = principalResult.value;
  }
  
  // Update last deposit time
  let depositTimeResult = contract.try_userDepositTime(Address.fromString(user.address));
  if (!depositTimeResult.reverted) {
    user.lastDepositTime = depositTimeResult.value;
  }
}

export function handleDeposit(event: DepositEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  let user = getOrCreateUser(event.params.owner, vault, event.block.timestamp);
  
  // Create deposit entity
  let deposit = new Deposit(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  deposit.vault = vault.id;
  deposit.user = user.id;
  deposit.sender = event.params.sender.toHexString();
  deposit.receiver = event.params.owner.toHexString();
  deposit.assets = event.params.assets;
  deposit.shares = event.params.shares;
  
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash.toHexString();
  deposit.logIndex = event.logIndex;
  
  // Update states
  updateVaultState(vault, event.block.number);
  updateUserState(user, vault);
  
  // Record vault state at time of deposit
  deposit.vaultTotalAssets = vault.totalAssets;
  deposit.vaultTotalSupply = vault.totalSupply;
  deposit.currentAllocation = vault.currentAllocation;
  
  // Update aggregated stats
  vault.totalDeposited = vault.totalDeposited.plus(event.params.assets);
  user.totalDeposited = user.totalDeposited.plus(event.params.assets);
  user.depositCount = user.depositCount + 1;
  user.lastActivityAt = event.block.timestamp;
  
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  deposit.save();
  user.save();
  vault.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  let user = getOrCreateUser(event.params.owner, vault, event.block.timestamp);
  
  // Create withdrawal entity
  let withdrawal = new Withdrawal(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  withdrawal.vault = vault.id;
  withdrawal.user = user.id;
  withdrawal.sender = event.params.sender.toHexString();
  withdrawal.receiver = event.params.receiver.toHexString();
  withdrawal.owner = event.params.owner.toHexString();
  withdrawal.assets = event.params.assets;
  withdrawal.shares = event.params.shares;
  
  withdrawal.blockNumber = event.block.number;
  withdrawal.blockTimestamp = event.block.timestamp;
  withdrawal.transactionHash = event.transaction.hash.toHexString();
  withdrawal.logIndex = event.logIndex;
  
  // Update states
  updateVaultState(vault, event.block.number);
  updateUserState(user, vault);
  
  // Record vault state at time of withdrawal
  withdrawal.vaultTotalAssets = vault.totalAssets;
  withdrawal.vaultTotalSupply = vault.totalSupply;
  withdrawal.currentAllocation = vault.currentAllocation;
  
  // Update aggregated stats
  vault.totalWithdrawn = vault.totalWithdrawn.plus(event.params.assets);
  user.totalWithdrawn = user.totalWithdrawn.plus(event.params.assets);
  user.withdrawalCount = user.withdrawalCount + 1;
  user.lastActivityAt = event.block.timestamp;
  
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  withdrawal.save();
  user.save();
  vault.save();
}

export function handleRebalanced(event: RebalancedEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  
  // Create rebalance entity
  let rebalance = new Rebalance(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  rebalance.vault = vault.id;
  rebalance.fromAsset = event.params.from.toHexString();
  rebalance.toAsset = event.params.to.toHexString();
  rebalance.amount = event.params.amount;
  
  rebalance.blockNumber = event.block.number;
  rebalance.blockTimestamp = event.block.timestamp;
  rebalance.transactionHash = event.transaction.hash.toHexString();
  rebalance.logIndex = event.logIndex;
  
  // Update vault state
  updateVaultState(vault, event.block.number);
  
  rebalance.vaultTotalAssets = vault.totalAssets;
  rebalance.newAllocation = vault.currentAllocation;
  
  // Update aggregated stats
  vault.rebalanceCount = vault.rebalanceCount + 1;
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  rebalance.save();
  vault.save();
}

export function handleFeesClaimed(event: FeesClaimedEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  
  // Create fee claim entity
  let feeClaim = new FeeClaim(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  feeClaim.vault = vault.id;
  feeClaim.amount = event.params.amount;
  feeClaim.claimedBy = event.transaction.from.toHexString();
  
  feeClaim.blockNumber = event.block.number;
  feeClaim.blockTimestamp = event.block.timestamp;
  feeClaim.transactionHash = event.transaction.hash.toHexString();
  feeClaim.logIndex = event.logIndex;
  
  // Update vault state
  updateVaultState(vault, event.block.number);
  
  feeClaim.vaultTotalAssets = vault.totalAssets;
  feeClaim.totalPrincipal = vault.totalPrincipal;
  
  // Update aggregated stats
  vault.totalFeesClaimed = vault.totalFeesClaimed.plus(event.params.amount);
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  feeClaim.save();
  vault.save();
}

export function handleEmergencyPaused(event: EmergencyPausedEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  
  // Create emergency pause entity
  let pause = new EmergencyPause(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  pause.vault = vault.id;
  pause.pausedBy = event.transaction.from.toHexString();
  
  pause.blockNumber = event.block.number;
  pause.blockTimestamp = event.block.timestamp;
  pause.transactionHash = event.transaction.hash.toHexString();
  pause.logIndex = event.logIndex;
  
  // Update vault state
  updateVaultState(vault, event.block.number);
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  pause.save();
  vault.save();
}

export function handleUnpaused(event: UnpausedEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  
  // Create unpause entity
  let unpause = new Unpause(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  unpause.vault = vault.id;
  unpause.unpausedBy = event.transaction.from.toHexString();
  
  unpause.blockNumber = event.block.number;
  unpause.blockTimestamp = event.block.timestamp;
  unpause.transactionHash = event.transaction.hash.toHexString();
  unpause.logIndex = event.logIndex;
  
  // Update vault state
  updateVaultState(vault, event.block.number);
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  unpause.save();
  vault.save();
}

export function handleTvlCapUpdated(event: TvlCapUpdatedEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  
  // Create TVL cap update entity
  let tvlCapUpdate = new TvlCapUpdate(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  tvlCapUpdate.vault = vault.id;
  tvlCapUpdate.newCap = event.params.newCap;
  tvlCapUpdate.previousCap = vault.tvlCap; // Store previous cap
  tvlCapUpdate.updatedBy = event.transaction.from.toHexString();
  
  tvlCapUpdate.blockNumber = event.block.number;
  tvlCapUpdate.blockTimestamp = event.block.timestamp;
  tvlCapUpdate.transactionHash = event.transaction.hash.toHexString();
  tvlCapUpdate.logIndex = event.logIndex;
  
  // Update vault state
  vault.tvlCap = event.params.newCap;
  updateVaultState(vault, event.block.number);
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  tvlCapUpdate.save();
  vault.save();
}

export function handleRouteSelected(event: RouteSelectedEvent): void {
  let vault = getOrCreateVault(event.address, event.block.number, event.block.timestamp);
  
  // Create route selection entity
  let routeSelection = new RouteSelection(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  routeSelection.vault = vault.id;
  routeSelection.router = event.params.router.toHexString();
  routeSelection.fee = BigInt.fromI32(event.params.fee);
  routeSelection.amountIn = event.params.amountIn;
  routeSelection.amountOut = event.params.amountOut;
  
  routeSelection.blockNumber = event.block.number;
  routeSelection.blockTimestamp = event.block.timestamp;
  routeSelection.transactionHash = event.transaction.hash.toHexString();
  routeSelection.logIndex = event.logIndex;
  
  // Update vault state
  updateVaultState(vault, event.block.number);
  vault.updatedAt = event.block.timestamp;
  
  // Save entities
  routeSelection.save();
  vault.save();
}