/* eslint-disable prefer-const */
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { bigDecimalExponated, safeDiv } from '.'
import { Tick } from '../types/schema'
import { Mint as MintEvent } from '../types/templates/Pool/Pool'
import { ONE_BD, ZERO_BD, ZERO_BI } from './constants'

export function createTick(tickId: string, tickIdx: i32, poolId: string, event: MintEvent): Tick {
  let tick = new Tick(tickId)
  tick.tickIdx = BigInt.fromI32(tickIdx)
  tick.pool = poolId
  tick.poolAddress = poolId

  tick.createdAtTimestamp = event.block.timestamp
  tick.createdAtBlockNumber = event.block.number
  tick.liquidityGross = ZERO_BI
  tick.liquidityNet = ZERO_BI
  tick.liquidityProviderCount = ZERO_BI

  tick.price0 = ONE_BD
  tick.price1 = ONE_BD

  // 1.0001^tick is token1/token0.
  let price0 = bigDecimalExponated(BigDecimal.fromString('1.0001'), BigInt.fromI32(tickIdx))
  tick.price0 = price0
  tick.price1 = safeDiv(ONE_BD, price0)

  tick.volumeToken0 = ZERO_BD
  tick.volumeToken1 = ZERO_BD
  tick.collectedFeesToken0 = ZERO_BD
  tick.collectedFeesToken1 = ZERO_BD
  tick.liquidityProviderCount = ZERO_BI
  tick.feeGrowthOutside0X128 = ZERO_BI
  tick.feeGrowthOutside1X128 = ZERO_BI

  return tick
}

export function feeTierToTickSpacing(feeTier: BigInt): BigInt {
  if (feeTier.equals(BigInt.fromI32(10000))) {
    return BigInt.fromI32(200)
  }
  if (feeTier.equals(BigInt.fromI32(3000))) {
    return BigInt.fromI32(60)
  }
  if (feeTier.equals(BigInt.fromI32(500))) {
    return BigInt.fromI32(10)
  }
  if (feeTier.equals(BigInt.fromI32(100))) {
    return BigInt.fromI32(1)
  }

  throw Error('Unexpected fee tier')
}
