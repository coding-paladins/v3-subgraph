import { ZERO_BD, ZERO_BI, ONE_BI } from './constants'
/* eslint-disable prefer-const */
import {
  Pool,
  PoolSnapshot
} from './../types/schema'
import { ethereum } from '@graphprotocol/graph-ts'


export function updatePoolSnapshot(event: ethereum.Event): PoolSnapshot {
  let pool = Pool.load(event.address.toHexString())!
  let id = event.address.toHexString() + '#' + event.block.number.toString()
  let poolSnapshot = PoolSnapshot.load(id)
  if (poolSnapshot === null) {
    poolSnapshot = new PoolSnapshot(id)
    poolSnapshot.blockNumber = event.block.number
    poolSnapshot.timestamp = event.block.timestamp
    poolSnapshot.pool = pool.id
    // things that dont get initialized always
    poolSnapshot.volumeToken0 = ZERO_BD
    poolSnapshot.volumeToken1 = ZERO_BD
    poolSnapshot.txCount = ZERO_BI
    poolSnapshot.feeGrowthGlobal0X128 = ZERO_BI
    poolSnapshot.feeGrowthGlobal1X128 = ZERO_BI
  }

  poolSnapshot.liquidity = pool.liquidity
  poolSnapshot.sqrtPrice = pool.sqrtPrice
  poolSnapshot.token0Price = pool.token0Price
  poolSnapshot.token1Price = pool.token1Price
  poolSnapshot.feeGrowthGlobal0X128 = pool.feeGrowthGlobal0X128
  poolSnapshot.feeGrowthGlobal1X128 = pool.feeGrowthGlobal1X128
  poolSnapshot.tick = pool.tick
  poolSnapshot.txCount = poolSnapshot.txCount.plus(ONE_BI)
  poolSnapshot.save()

  return poolSnapshot as PoolSnapshot
}

