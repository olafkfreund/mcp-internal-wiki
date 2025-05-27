#!/bin/bash

# Run All Tests Script
# This script runs all tests for the MCP Private Wiki POC

# Set text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
RESET="\033[0m"
BOLD="\033[1m"

# Test results storage
TEST_RESULTS=()

echo -e "${BOLD}${BLUE}=== MCP Private Wiki Authentication - Complete Test Suite ===${RESET}\n"

# Check if Docker is running
echo -e "${YELLOW}Checking if Docker is running...${RESET}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker is not running. Please start Docker and try again.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Docker is running${RESET}\n"

# Make sure containers are running
echo -e "${YELLOW}Checking if containers are running...${RESET}"
if ! ./check-services.sh > /dev/null 2>&1; then
  echo -e "${YELLOW}Starting containers...${RESET}"
  npm run start:detach
  echo -e "${YELLOW}Waiting for containers to initialize (15 seconds)...${RESET}"
  sleep 15
  if ! ./check-services.sh > /dev/null 2>&1; then
    echo -e "${RED}Failed to start containers.${RESET}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ Containers are running${RESET}\n"

# Function to run a test and record result
run_test() {
  local test_name="$1"
  local test_command="$2"
  
  echo -e "${BOLD}${BLUE}Running Test: ${test_name}${RESET}\n"
  if eval "$test_command"; then
    echo -e "\n${GREEN}✓ ${test_name} completed successfully${RESET}\n"
    TEST_RESULTS+=("${GREEN}✓ ${test_name}${RESET}")
  else
    echo -e "\n${RED}✗ ${test_name} failed${RESET}\n"
    TEST_RESULTS+=("${RED}✗ ${test_name}${RESET}")
  fi
  
  echo -e "${YELLOW}---------------------------------------${RESET}\n"
  sleep 2
}

# Run each test
run_test "Container Health Monitor" "node monitor-containers.js"
run_test "Basic Authentication Tests" "node test-auth-poc.js"
run_test "Integration Authentication Tests" "node auth-integration-test.js"
run_test "Quick Context Query" "npm run -s quicktest"

# Display summary
echo -e "${BOLD}${BLUE}=== Test Results Summary ===${RESET}\n"
for result in "${TEST_RESULTS[@]}"; do
  echo -e "$result"
done

echo -e "\n${BOLD}${BLUE}=== Complete Test Suite Finished ===${RESET}"
echo -e "${YELLOW}For more detailed testing, run: npm run menu${RESET}\n"
