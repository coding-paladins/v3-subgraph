import { log } from "@graphprotocol/graph-ts"
import { runStaticTokenDefinitionTests } from "./static-token-definition.test"
import { runUtilsTests } from "./utils.test"

// Main test runner that executes all test suites
export function runAllTests(): void {
  log.info("🚀 Starting Uniswap V3 Subgraph Tests", [])
  log.info("=========================================", [])
  
  // Run StaticTokenDefinition tests
  runStaticTokenDefinitionTests()
  
  log.info("", []) // Empty line for spacing
  
  // Run Utils tests
  runUtilsTests()
  
  log.info("", []) // Empty line for spacing
  log.info("✅ All test suites completed", [])
  log.info("=========================================", [])
}

// Entry point for running tests
runAllTests() 