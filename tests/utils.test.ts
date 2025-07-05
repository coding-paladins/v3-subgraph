import { Address, BigInt, BigDecimal, log } from "@graphprotocol/graph-ts"
import { 
  convertTokenToDecimal, 
  exponentToBigDecimal, 
  safeDiv, 
  bigDecimalExponated, 
  isNullEthValue,
  loadTransaction 
} from "../src/utils/index"
import { ZERO_BI, ZERO_BD, ONE_BI, ONE_BD } from "../src/utils/constants"

// Simple test runner function
function runTest(testName: string, testFunction: () => boolean): void {
  log.info("Running test: {}", [testName])
  let result = testFunction()
  if (result) {
    log.info("✓ Test passed: {}", [testName])
  } else {
    log.error("✗ Test failed: {}", [testName])
  }
}

// Test exponentToBigDecimal function
function testExponentToBigDecimal(): boolean {
  // Test with 0 decimals
  let result0 = exponentToBigDecimal(ZERO_BI)
  if (!result0.equals(ONE_BD)) {
    log.error("Expected 1 for 0 decimals, got {}", [result0.toString()])
    return false
  }
  
  // Test with 1 decimal
  let result1 = exponentToBigDecimal(ONE_BI)
  let expected1 = BigDecimal.fromString("10")
  if (!result1.equals(expected1)) {
    log.error("Expected 10 for 1 decimal, got {}", [result1.toString()])
    return false
  }
  
  // Test with 18 decimals (common for ERC20)
  let result18 = exponentToBigDecimal(BigInt.fromI32(18))
  let expected18 = BigDecimal.fromString("1000000000000000000")
  if (!result18.equals(expected18)) {
    log.error("Expected 1e18 for 18 decimals, got {}", [result18.toString()])
    return false
  }
  
  return true
}

// Test safeDiv function
function testSafeDiv(): boolean {
  // Test normal division
  let result1 = safeDiv(BigDecimal.fromString("10"), BigDecimal.fromString("2"))
  let expected1 = BigDecimal.fromString("5")
  if (!result1.equals(expected1)) {
    log.error("Expected 5 for 10/2, got {}", [result1.toString()])
    return false
  }
  
  // Test division by zero (should return 0)
  let result2 = safeDiv(BigDecimal.fromString("10"), ZERO_BD)
  if (!result2.equals(ZERO_BD)) {
    log.error("Expected 0 for division by zero, got {}", [result2.toString()])
    return false
  }
  
  // Test zero divided by number
  let result3 = safeDiv(ZERO_BD, BigDecimal.fromString("5"))
  if (!result3.equals(ZERO_BD)) {
    log.error("Expected 0 for 0/5, got {}", [result3.toString()])
    return false
  }
  
  return true
}

// Test bigDecimalExponated function
function testBigDecimalExponated(): boolean {
  // Test with power 0 (should return 1)
  let result0 = bigDecimalExponated(BigDecimal.fromString("5"), ZERO_BI)
  if (!result0.equals(ONE_BD)) {
    log.error("Expected 1 for power 0, got {}", [result0.toString()])
    return false
  }
  
  // Test with power 1
  let base1 = BigDecimal.fromString("3")
  let result1 = bigDecimalExponated(base1, ONE_BI)
  if (!result1.equals(base1)) {
    log.error("Expected 3 for 3^1, got {}", [result1.toString()])
    return false
  }
  
  // Test with power 2
  let result2 = bigDecimalExponated(BigDecimal.fromString("2"), BigInt.fromI32(2))
  let expected2 = BigDecimal.fromString("4")
  if (!result2.equals(expected2)) {
    log.error("Expected 4 for 2^2, got {}", [result2.toString()])
    return false
  }
  
  // Test with power 3
  let result3 = bigDecimalExponated(BigDecimal.fromString("2"), BigInt.fromI32(3))
  let expected3 = BigDecimal.fromString("8")
  if (!result3.equals(expected3)) {
    log.error("Expected 8 for 2^3, got {}", [result3.toString()])
    return false
  }
  
  return true
}

// Test convertTokenToDecimal function
function testConvertTokenToDecimal(): boolean {
  // Test with 0 decimals
  let result0 = convertTokenToDecimal(BigInt.fromI32(100), ZERO_BI)
  let expected0 = BigDecimal.fromString("100")
  if (!result0.equals(expected0)) {
    log.error("Expected 100 for 0 decimals, got {}", [result0.toString()])
    return false
  }
  
  // Test with 18 decimals (1 token = 1e18 wei)
  let result18 = convertTokenToDecimal(BigInt.fromString("1000000000000000000"), BigInt.fromI32(18))
  let expected18 = BigDecimal.fromString("1")
  if (!result18.equals(expected18)) {
    log.error("Expected 1 for 1e18 wei with 18 decimals, got {}", [result18.toString()])
    return false
  }
  
  // Test with 6 decimals (USDC)
  let result6 = convertTokenToDecimal(BigInt.fromString("1000000"), BigInt.fromI32(6))
  let expected6 = BigDecimal.fromString("1")
  if (!result6.equals(expected6)) {
    log.error("Expected 1 for 1e6 with 6 decimals, got {}", [result6.toString()])
    return false
  }
  
  return true
}

// Test isNullEthValue function
function testIsNullEthValue(): boolean {
  // Test with null ETH value
  let nullValue = "0x0000000000000000000000000000000000000000000000000000000000000001"
  if (!isNullEthValue(nullValue)) {
    log.error("Expected true for null ETH value", [])
    return false
  }
  
  // Test with normal address
  let normalAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  if (isNullEthValue(normalAddress)) {
    log.error("Expected false for normal address", [])
    return false
  }
  
  // Test with zero address
  let zeroAddress = "0x0000000000000000000000000000000000000000000000000000000000000000"
  if (isNullEthValue(zeroAddress)) {
    log.error("Expected false for zero address", [])
    return false
  }
  
  return true
}

// Test constants
function testConstants(): boolean {
  // Test ZERO_BI
  if (!ZERO_BI.equals(BigInt.fromI32(0))) {
    log.error("ZERO_BI should equal 0", [])
    return false
  }
  
  // Test ONE_BI
  if (!ONE_BI.equals(BigInt.fromI32(1))) {
    log.error("ONE_BI should equal 1", [])
    return false
  }
  
  // Test ZERO_BD
  if (!ZERO_BD.equals(BigDecimal.fromString("0"))) {
    log.error("ZERO_BD should equal 0", [])
    return false
  }
  
  // Test ONE_BD
  if (!ONE_BD.equals(BigDecimal.fromString("1"))) {
    log.error("ONE_BD should equal 1", [])
    return false
  }
  
  return true
}

// Test edge cases for exponentToBigDecimal
function testExponentToBigDecimalEdgeCases(): boolean {
  // Test with large number (common in DeFi)
  let result24 = exponentToBigDecimal(BigInt.fromI32(24))
  let expected24 = BigDecimal.fromString("1000000000000000000000000")
  if (!result24.equals(expected24)) {
    log.error("Expected 1e24 for 24 decimals, got {}", [result24.toString()])
    return false
  }
  
  return true
}

// Test precision with convertTokenToDecimal
function testConvertTokenToDecimalPrecision(): boolean {
  // Test with fractional amounts
  let result = convertTokenToDecimal(BigInt.fromString("500000000000000000"), BigInt.fromI32(18))
  let expected = BigDecimal.fromString("0.5")
  if (!result.equals(expected)) {
    log.error("Expected 0.5 for 5e17 wei with 18 decimals, got {}", [result.toString()])
    return false
  }
  
  // Test with very small amounts
  let result2 = convertTokenToDecimal(BigInt.fromI32(1), BigInt.fromI32(18))
  let expected2 = BigDecimal.fromString("0.000000000000000001")
  if (!result2.equals(expected2)) {
    log.error("Expected 1e-18 for 1 wei with 18 decimals, got {}", [result2.toString()])
    return false
  }
  
  return true
}

// Main test runner
export function runUtilsTests(): void {
  log.info("Starting Utils tests", [])
  
  runTest("exponentToBigDecimal", testExponentToBigDecimal)
  runTest("safeDiv", testSafeDiv)
  runTest("bigDecimalExponated", testBigDecimalExponated)
  runTest("convertTokenToDecimal", testConvertTokenToDecimal)
  runTest("isNullEthValue", testIsNullEthValue)
  runTest("constants", testConstants)
  runTest("exponentToBigDecimal edge cases", testExponentToBigDecimalEdgeCases)
  runTest("convertTokenToDecimal precision", testConvertTokenToDecimalPrecision)
  
  log.info("Utils tests completed", [])
} 