import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { StaticTokenDefinition } from "../src/utils/staticTokenDefinition"

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

// Test that getStaticDefinitions returns correct number of tokens
function testGetStaticDefinitionsLength(): boolean {
  let definitions = StaticTokenDefinition.getStaticDefinitions()
  
  // Should have 6 tokens
  if (definitions.length != 6) {
    log.error("Expected 6 tokens, got {}", [definitions.length.toString()])
    return false
  }
  
  // None should be null (this was the original bug)
  for (let i = 0; i < definitions.length; i++) {
    if (definitions[i] == null) {
      log.error("Token at index {} is null", [i.toString()])
      return false
    }
  }
  
  return true
}

// Test that all tokens have correct structure
function testTokenStructure(): boolean {
  let definitions = StaticTokenDefinition.getStaticDefinitions()
  
  for (let i = 0; i < definitions.length; i++) {
    let token = definitions[i]
    
    // Check all fields are properly set
    if (token.symbol.length == 0) {
      log.error("Token {} has empty symbol", [i.toString()])
      return false
    }
    if (token.name.length == 0) {
      log.error("Token {} has empty name", [i.toString()])
      return false
    }
    if (token.decimals.lt(BigInt.zero())) {
      log.error("Token {} has invalid decimals", [i.toString()])
      return false
    }
  }
  
  return true
}

// Test DGD token lookup
function testDGDTokenLookup(): boolean {
  let dgdAddress = Address.fromString("0xe0b7927c4af23765cb51314a0e0521a9645f0e2a")
  let token = StaticTokenDefinition.fromAddress(dgdAddress)
  
  if (token == null) {
    log.error("DGD token not found", [])
    return false
  }
  
  if (token.symbol != "DGD") {
    log.error("Expected DGD symbol, got {}", [token.symbol])
    return false
  }
  
  if (token.name != "DGD") {
    log.error("Expected DGD name, got {}", [token.name])
    return false
  }
  
  if (!token.decimals.equals(BigInt.fromI32(9))) {
    log.error("Expected 9 decimals, got {}", [token.decimals.toString()])
    return false
  }
  
  return true
}

// Test AAVE token lookup
function testAAVETokenLookup(): boolean {
  let aaveAddress = Address.fromString("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9")
  let token = StaticTokenDefinition.fromAddress(aaveAddress)
  
  if (token == null) {
    log.error("AAVE token not found", [])
    return false
  }
  
  if (token.symbol != "AAVE") {
    log.error("Expected AAVE symbol, got {}", [token.symbol])
    return false
  }
  
  if (token.name != "Aave Token") {
    log.error("Expected 'Aave Token' name, got {}", [token.name])
    return false
  }
  
  if (!token.decimals.equals(BigInt.fromI32(18))) {
    log.error("Expected 18 decimals, got {}", [token.decimals.toString()])
    return false
  }
  
  return true
}

// Test unknown token lookup
function testUnknownTokenLookup(): boolean {
  let unknownAddress = Address.fromString("0x0000000000000000000000000000000000000001")
  let token = StaticTokenDefinition.fromAddress(unknownAddress)
  
  if (token != null) {
    log.error("Expected null for unknown token, got {}", [token.symbol])
    return false
  }
  
  return true
}

// Test for duplicate addresses
function testNoDuplicateAddresses(): boolean {
  let definitions = StaticTokenDefinition.getStaticDefinitions()
  let addresses = new Array<string>()
  
  for (let i = 0; i < definitions.length; i++) {
    let addressHex = definitions[i].address.toHexString()
    
    // Check if address already exists
    for (let j = 0; j < addresses.length; j++) {
      if (addresses[j] == addressHex) {
        log.error("Duplicate address found: {}", [addressHex])
        return false
      }
    }
    
    addresses.push(addressHex)
  }
  
  return true
}

// Test TheDAO token with 16 decimals
function testTheDAOTokenLookup(): boolean {
  let daoAddress = Address.fromString("0xbb9bc244d798123fde783fcc1c72d3bb8c189413")
  let token = StaticTokenDefinition.fromAddress(daoAddress)
  
  if (token == null) {
    log.error("TheDAO token not found", [])
    return false
  }
  
  if (token.symbol != "TheDAO") {
    log.error("Expected TheDAO symbol, got {}", [token.symbol])
    return false
  }
  
  if (!token.decimals.equals(BigInt.fromI32(16))) {
    log.error("Expected 16 decimals for TheDAO, got {}", [token.decimals.toString()])
    return false
  }
  
  return true
}

// Main test runner
export function runStaticTokenDefinitionTests(): void {
  log.info("Starting StaticTokenDefinition tests", [])
  
  runTest("getStaticDefinitions returns correct number of tokens", testGetStaticDefinitionsLength)
  runTest("all tokens have correct structure", testTokenStructure)
  runTest("DGD token lookup", testDGDTokenLookup)
  runTest("AAVE token lookup", testAAVETokenLookup)
  runTest("unknown token lookup returns null", testUnknownTokenLookup)
  runTest("no duplicate addresses", testNoDuplicateAddresses)
  runTest("TheDAO token with 16 decimals", testTheDAOTokenLookup)
  
  log.info("StaticTokenDefinition tests completed", [])
} 