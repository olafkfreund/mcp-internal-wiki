#!/usr/bin/env node

/**
 * POC Test Runner Utility
 * 
 * This script provides a unified interface for running tests and tools
 * for the MCP Private Wiki Authentication POC
 */

const { execSync, spawn } = require('child_process');
const readline = require('readline');
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Display banner
console.log(`${colors.bright}${colors.blue}=== MCP Private Wiki Authentication POC - Test Runner ===${colors.reset}\n`);

// Check if Docker is running
function checkDockerRunning() {
  try {
    console.log(`${colors.dim}Checking if Docker is running...${colors.reset}`);
    execSync('docker info > /dev/null 2>&1');
    console.log(`${colors.green}✓ Docker is running${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Docker is not running${colors.reset}`);
    console.log(`${colors.yellow}Please start Docker and try again${colors.reset}`);
    return false;
  }
}

// Check container status
function checkContainers() {
  try {
    console.log(`${colors.dim}Checking container status...${colors.reset}`);
    const output = execSync('docker-compose ps --format json', { cwd: __dirname }).toString();
    const containers = output ? JSON.parse(output) : [];
    
    if (containers.length === 0) {
      console.log(`${colors.yellow}⚠ No containers found. They may need to be started.${colors.reset}`);
      return false;
    }
    
    let allRunning = true;
    containers.forEach(container => {
      const isRunning = container.State === 'running';
      console.log(`${isRunning ? colors.green + '✓' : colors.red + '✗'} ${container.Service}: ${container.State}${colors.reset}`);
      allRunning = allRunning && isRunning;
    });
    
    return allRunning;
  } catch (error) {
    console.log(`${colors.red}✗ Error checking containers: ${error.message}${colors.reset}`);
    return false;
  }
}

// Start containers if needed
function startContainersIfNeeded() {
  if (!checkContainers()) {
    console.log(`${colors.yellow}Starting containers...${colors.reset}`);
    try {
      execSync('npm run start:detach', { cwd: __dirname, stdio: 'inherit' });
      console.log(`${colors.dim}Waiting for containers to initialize (10 seconds)...${colors.reset}`);
      execSync('sleep 10');
      if (!checkContainers()) {
        console.log(`${colors.red}✗ Failed to start all containers properly${colors.reset}`);
        return false;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Error starting containers: ${error.message}${colors.reset}`);
      return false;
    }
  }
  return true;
}

// Run the test script
function runTests(verbose = false) {
  console.log(`${colors.yellow}Running authentication tests${colors.verbose ? ' (verbose mode)' : ''}...${colors.reset}`);
  try {
    execSync(`npm run test${verbose ? ':verbose' : ''}`, { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Tests failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run the interactive client
function runInteractive() {
  console.log(`${colors.yellow}Starting interactive test client...${colors.reset}`);
  try {
    // Use spawn to keep the process running
    const child = spawn('node', ['interactive-test-client.js'], { 
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    child.on('error', (error) => {
      console.log(`${colors.red}✗ Error running interactive client: ${error.message}${colors.reset}`);
    });
    
    // Let the interactive client take over
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Error starting interactive client: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run a quick test with a predefined query
function runQuickTest() {
  console.log(`${colors.yellow}Running quick test...${colors.reset}`);
  try {
    execSync('npm run quicktest', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Quick test failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Restart containers
function restartContainers() {
  console.log(`${colors.yellow}Restarting containers...${colors.reset}`);
  try {
    execSync('./restart.sh', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed to restart containers: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run integration tests
function runIntegrationTests() {
  console.log(`${colors.yellow}Running integration tests...${colors.reset}`);
  try {
    execSync('npm run test:integration', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Integration tests failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run container monitor
function runContainerMonitor() {
  console.log(`${colors.yellow}Running container monitor...${colors.reset}`);
  try {
    execSync('npm run monitor', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Container monitor failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Display the menu
function showMenu() {
  console.log(`\n${colors.bright}Available Commands:${colors.reset}`);
  console.log(`  ${colors.bright}1${colors.reset}) Run Basic Authentication Tests`);
  console.log(`  ${colors.bright}2${colors.reset}) Run Interactive Client`);
  console.log(`  ${colors.bright}3${colors.reset}) Run Quick Test`);
  console.log(`  ${colors.bright}4${colors.reset}) Check Container Status`);
  console.log(`  ${colors.bright}5${colors.reset}) Restart Containers`);
  console.log(`  ${colors.bright}6${colors.reset}) Run Verbose Tests`);
  console.log(`  ${colors.bright}7${colors.reset}) Run Integration Tests`);
  console.log(`  ${colors.bright}8${colors.reset}) Run Container Health Monitor`);
  console.log(`  ${colors.bright}q${colors.reset}) Quit`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question(`\n${colors.bright}Enter your choice: ${colors.reset}`, (choice) => {
    rl.close();
    
    switch(choice.trim().toLowerCase()) {
      case '1':
        if (startContainersIfNeeded()) {
          runTests();
        }
        setTimeout(showMenu, 1000);
        break;
      case '2':
        if (startContainersIfNeeded()) {
          runInteractive();
          // No need to show menu again as interactive client will take over
        } else {
          setTimeout(showMenu, 1000);
        }
        break;
      case '3':
        if (startContainersIfNeeded()) {
          runQuickTest();
        }
        setTimeout(showMenu, 1000);
        break;
      case '4':
        checkDockerRunning() && checkContainers();
        setTimeout(showMenu, 1000);
        break;
      case '5':
        if (checkDockerRunning()) {
          restartContainers();
        }
        setTimeout(showMenu, 1000);
        break;
      case '6':
        if (startContainersIfNeeded()) {
          runTests(true);
        }
        setTimeout(showMenu, 1000);
        break;
      case '7':
        if (startContainersIfNeeded()) {
          runIntegrationTests();
        }
        setTimeout(showMenu, 1000);
        break;
      case '8':
        if (checkDockerRunning()) {
          runContainerMonitor();
        }
        setTimeout(showMenu, 1000);
        break;
      case 'q':
        console.log(`\n${colors.green}Goodbye!${colors.reset}`);
        process.exit(0);
        break;
      default:
        console.log(`\n${colors.red}Invalid choice. Please try again.${colors.reset}`);
        setTimeout(showMenu, 1000);
    }
  });
}

// Main function
function main() {
  if (!checkDockerRunning()) {
    process.exit(1);
  }
  
  showMenu();
}

// Start the program
main();
