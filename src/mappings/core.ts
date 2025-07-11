/* eslint-disable prefer-const */
import { Factory, Pool, Tick, Token } from '../types/schema'
import { Pool as PoolABI } from '../types/Factory/Pool'
import { BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts'
import {
  Burn as BurnEvent,
  Flash as FlashEvent,
  Initialize,
  Mint as MintEvent,
  Swap as SwapEvent
} from '../types/templates/Pool/Pool'
import { convertTokenToDecimal } from '../utils'
import { FACTORY_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI } from '../utils/constants'
import { sqrtPriceX96ToTokenPrices } from '../utils/pricing'
import {
  updatePoolSnapshot
} from '../utils/intervalUpdates'
import { createTick, feeTierToTickSpacing } from '../utils/tick'

export function handleInitialize(event: Initialize): void {
  let pool = Pool.load(event.address.toHexString())!
  pool.sqrtPrice = event.params.sqrtPriceX96
  pool.tick = BigInt.fromI32(event.params.tick)
  pool.save()
  updatePoolSnapshot(event)
}

export function handleMint(event: MintEvent): void {
  let poolAddress = event.address.toHexString()
  let pool = Pool.load(poolAddress)!
  let factory = Factory.load(FACTORY_ADDRESS)!

  let token0 = Token.load(pool.token0)!
  let token1 = Token.load(pool.token1)!
  let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update globals
  factory.txCount = factory.txCount.plus(ONE_BI)

  // update token0 data
  token0.txCount = token0.txCount.plus(ONE_BI)
  token0.totalValueLocked = token0.totalValueLocked.plus(amount0)

  // update token1 data
  token1.txCount = token1.txCount.plus(ONE_BI)
  token1.totalValueLocked = token1.totalValueLocked.plus(amount1)

  // pool data
  pool.txCount = pool.txCount.plus(ONE_BI)

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on mint if the new position includes the current tick.
  if (
    pool.tick !== null &&
    BigInt.fromI32(event.params.tickLower).le(pool.tick as BigInt) &&
    BigInt.fromI32(event.params.tickUpper).gt(pool.tick as BigInt)
  ) {
    pool.liquidity = pool.liquidity.plus(event.params.amount)
  }

  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)

  // tick entities
  let lowerTickIdx = event.params.tickLower
  let upperTickIdx = event.params.tickUpper

  let lowerTickId = poolAddress + '#' + BigInt.fromI32(event.params.tickLower).toString()
  let upperTickId = poolAddress + '#' + BigInt.fromI32(event.params.tickUpper).toString()

  let lowerTick = Tick.load(lowerTickId)
  let upperTick = Tick.load(upperTickId)

  if (lowerTick === null) {
    lowerTick = createTick(lowerTickId, lowerTickIdx, pool.id, event)
  }

  if (upperTick === null) {
    upperTick = createTick(upperTickId, upperTickIdx, pool.id, event)
  }

  let amount = event.params.amount
  lowerTick.liquidityGross = lowerTick.liquidityGross.plus(amount)
  lowerTick.liquidityNet = lowerTick.liquidityNet.plus(amount)
  upperTick.liquidityGross = upperTick.liquidityGross.plus(amount)
  upperTick.liquidityNet = upperTick.liquidityNet.minus(amount)

  updatePoolSnapshot(event)

  token0.save()
  token1.save()
  pool.save()
  factory.save()

  // Update inner tick vars and save the ticks
  updateTickFeeVarsAndSave(lowerTick, event)
  updateTickFeeVarsAndSave(upperTick, event)
}

export function handleBurn(event: BurnEvent): void {
  let poolAddress = event.address.toHexString()
  let pool = Pool.load(poolAddress)!
  let factory = Factory.load(FACTORY_ADDRESS)!

  let token0 = Token.load(pool.token0)!
  let token1 = Token.load(pool.token1)!
  let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update globals
  factory.txCount = factory.txCount.plus(ONE_BI)

  // update token0 data
  token0.txCount = token0.txCount.plus(ONE_BI)
  token0.totalValueLocked = token0.totalValueLocked.minus(amount0)

  // update token1 data
  token1.txCount = token1.txCount.plus(ONE_BI)
  token1.totalValueLocked = token1.totalValueLocked.minus(amount1)

  // pool data
  pool.txCount = pool.txCount.plus(ONE_BI)
  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on burn if the position being burnt includes the current tick.
  if (
    pool.tick !== null &&
    BigInt.fromI32(event.params.tickLower).le(pool.tick as BigInt) &&
    BigInt.fromI32(event.params.tickUpper).gt(pool.tick as BigInt)
  ) {
    pool.liquidity = pool.liquidity.minus(event.params.amount)
  }

  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.minus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.minus(amount1)


  // tick entities
  let lowerTickId = poolAddress + '#' + BigInt.fromI32(event.params.tickLower).toString()
  let upperTickId = poolAddress + '#' + BigInt.fromI32(event.params.tickUpper).toString()
  let lowerTick = Tick.load(lowerTickId)
  let upperTick = Tick.load(upperTickId)

  if (lowerTick && upperTick) {
    let amount = event.params.amount
    lowerTick.liquidityGross = lowerTick.liquidityGross.minus(amount)
    lowerTick.liquidityNet = lowerTick.liquidityNet.minus(amount)
    upperTick.liquidityGross = upperTick.liquidityGross.minus(amount)
    upperTick.liquidityNet = upperTick.liquidityNet.plus(amount)

    updateTickFeeVarsAndSave(lowerTick, event)
    updateTickFeeVarsAndSave(upperTick, event)
  }

  updatePoolSnapshot(event)


  token0.save()
  token1.save()
  pool.save()
  factory.save()
}

export function handleSwap(event: SwapEvent): void {
  let factory = Factory.load(FACTORY_ADDRESS)!
  let pool = Pool.load(event.address.toHexString())!

  let token0 = Token.load(pool.token0)!
  let token1 = Token.load(pool.token1)!

  let oldTick = pool.tick

  // amounts - 0/1 are token deltas: can be positive or negative
  let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // need absolute amounts for volume
  let amount0Abs = amount0
  if (amount0.lt(ZERO_BD)) {
    amount0Abs = amount0.times(BigDecimal.fromString('-1'))
  }
  let amount1Abs = amount1
  if (amount1.lt(ZERO_BD)) {
    amount1Abs = amount1.times(BigDecimal.fromString('-1'))
  }

  // global updates
  factory.txCount = factory.txCount.plus(ONE_BI)

  // pool volume
  pool.volumeToken0 = pool.volumeToken0.plus(amount0Abs)
  pool.volumeToken1 = pool.volumeToken1.plus(amount1Abs)
  pool.txCount = pool.txCount.plus(ONE_BI)

  // Update the pool with the new active liquidity, price, and tick.
  pool.liquidity = event.params.liquidity
  pool.tick = BigInt.fromI32(event.params.tick)
  pool.sqrtPrice = event.params.sqrtPriceX96
  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)

  // update token0 data
  token0.volume = token0.volume.plus(amount0Abs)
  token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
  token0.txCount = token0.txCount.plus(ONE_BI)

  // update token1 data
  token1.volume = token1.volume.plus(amount1Abs)
  token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // updated pool ratess
  let prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0 as Token, token1 as Token)
  pool.token0Price = prices[0]
  pool.token1Price = prices[1]
  pool.save()

  // update fee growth
  let poolContract = PoolABI.bind(event.address)
  let feeGrowthGlobal0X128 = poolContract.feeGrowthGlobal0X128()
  let feeGrowthGlobal1X128 = poolContract.feeGrowthGlobal1X128()
  pool.feeGrowthGlobal0X128 = feeGrowthGlobal0X128 as BigInt
  pool.feeGrowthGlobal1X128 = feeGrowthGlobal1X128 as BigInt

  // interval data
  let poolSnapshot = updatePoolSnapshot(event)

  // update volume metrics
  poolSnapshot.volumeToken0 = poolSnapshot.volumeToken0.plus(amount0Abs)
  poolSnapshot.volumeToken1 = poolSnapshot.volumeToken1.plus(amount1Abs)

  token0.volume = token0.volume.plus(amount0Abs)
  token1.volume = token1.volume.plus(amount1Abs)

  poolSnapshot.save()
  factory.save()
  pool.save()
  token0.save()
  token1.save()

  // Update inner vars of current or crossed ticks
  let newTick = pool.tick
  let tickSpacing = feeTierToTickSpacing(pool.feeTier)
  if (newTick) {
    let modulo = newTick.mod(tickSpacing)
    if (modulo.equals(ZERO_BI)) {
      // Current tick is initialized and needs to be updated
      loadTickUpdateFeeVarsAndSave(newTick.toI32(), event)
    }

    if (oldTick) {
      let numIters = oldTick
        .minus(newTick)
        .abs()
        .div(tickSpacing)

      if (numIters.gt(BigInt.fromI32(100))) {
        // In case more than 100 ticks need to be updated ignore the update in
        // order to avoid timeouts. From testing this behavior occurs only upon
        // pool initialization. This should not be a big issue as the ticks get
        // updated later. For early users this error also disappears when calling
        // collect
      } else if (newTick.gt(oldTick)) {
        let firstInitialized = oldTick.plus(tickSpacing.minus(modulo))
        for (let i = firstInitialized; i.le(newTick); i = i.plus(tickSpacing)) {
          loadTickUpdateFeeVarsAndSave(i.toI32(), event)
        }
      } else if (newTick.lt(oldTick)) {
        let firstInitialized = oldTick.minus(modulo)
        for (let i = firstInitialized; i.ge(newTick); i = i.minus(tickSpacing)) {
          loadTickUpdateFeeVarsAndSave(i.toI32(), event)
        }
      }
    }
  }
}

export function handleFlash(event: FlashEvent): void {
  // update fee growth
  let pool = Pool.load(event.address.toHexString())!
  let poolContract = PoolABI.bind(event.address)
  let feeGrowthGlobal0X128 = poolContract.feeGrowthGlobal0X128()
  let feeGrowthGlobal1X128 = poolContract.feeGrowthGlobal1X128()
  pool.feeGrowthGlobal0X128 = feeGrowthGlobal0X128 as BigInt
  pool.feeGrowthGlobal1X128 = feeGrowthGlobal1X128 as BigInt
  pool.save()
}

function updateTickFeeVarsAndSave(tick: Tick, event: ethereum.Event): void {
  let poolAddress = event.address
  // not all ticks are initialized so obtaining null is expected behavior
  let poolContract = PoolABI.bind(poolAddress)
  let tickResult = poolContract.ticks(tick.tickIdx.toI32())
  tick.feeGrowthOutside0X128 = tickResult.value2
  tick.feeGrowthOutside1X128 = tickResult.value3
  tick.save()
}

function loadTickUpdateFeeVarsAndSave(tickId: i32, event: ethereum.Event): void {
  let poolAddress = event.address
  let tick = Tick.load(
    poolAddress
      .toHexString()
      .concat('#')
      .concat(tickId.toString())
  )
  if (tick !== null) {
    updateTickFeeVarsAndSave(tick, event)
  }
}
