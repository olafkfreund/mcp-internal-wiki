#!/usr/bin/env node

/**
 * POC Container Health Monitor
 * 
 * This script monitors the health of Docker containers for the MCP Private Wiki Authentication POC
 */

const { execSync, exec } = require('child_process');

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
console.log(`${colors.bright}${colors.blue}=== MCP Private Wiki Authentication POC - Container Monitor ===${colors.reset}\n`);

// Get container status
function getContainerStatus() {
  try {
    const output = execSync('docker-compose ps --format json', { cwd: __dirname }).toString();
    return output ? JSON.parse(output) : [];
  } catch (error) {
    console.error(`${colors.red}Error getting container status: ${error.message}${colors.reset}`);
    return [];
  }
}

// Check container health
async function checkContainerHealth(container) {
  return new Promise((resolve) => {
    exec(`docker inspect --format='{{json .State.Health}}' ${container.ID}`, (error, stdout) => {
      if (error || !stdout) {
        resolve({ 
          status: 'unknown',
          details: 'No health check configured'
        });
        return;
      }
      
      try {
        const health = JSON.parse(stdout);
        if (health && health.Status) {
          resolve({
            status: health.Status,
            details: health.Log ? health.Log[0]?.Output.trim() : ''
          });
        } else {
          resolve({ 
            status: 'unknown',
            details: 'No health data available'
          });
        }
      } catch (e) {
        resolve({ 
          status: 'unknown',
          details: 'Failed to parse health data'
        });
      }
    });
  });
}

// Get container logs (last few lines)
async function getContainerLogs(container, lines = 5) {
  return new Promise((resolve) => {
    exec(`docker logs --tail ${lines} ${container.ID}`, (error, stdout) => {
      if (error || !stdout) {
        resolve('No logs available');
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Check network connectivity
async function checkNetworkConnectivity() {
  console.log(`${colors.yellow}Checking network connectivity between containers...${colors.reset}`);
  
  try {
    // Check if MCP server can reach markdown server
    const command = "docker exec poc-private-wiki-mcp-server-1 curl -s -o /dev/null -w '%{http_code}' -u admin:secret http://markdown-server:3001";
    const result = execSync(command).toString().trim();
    
    if (result === '200') {
      console.log(`${colors.green}✓ MCP server can reach markdown server (HTTP ${result})${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ MCP server cannot reach markdown server properly (HTTP ${result})${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Network connectivity check failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Display container details
async function displayContainerDetails() {
  const containers = getContainerStatus();
  
  if (containers.length === 0) {
    console.log(`${colors.yellow}No containers found. Run 'npm run start' to start containers.${colors.reset}`);
    return;
  }
  
  console.log(`${colors.bright}Container Status:${colors.reset}`);
  
  for (const container of containers) {
    const health = await checkContainerHealth(container);
    const healthStatus = health.status === 'healthy' ? `${colors.green}healthy${colors.reset}` : 
                        health.status === 'unhealthy' ? `${colors.red}unhealthy${colors.reset}` :
                        `${colors.yellow}${health.status || 'unknown'}${colors.reset}`;
    
    console.log(`\n${colors.bright}${container.Service}:${colors.reset}`);
    console.log(`  Status: ${container.State === 'running' ? colors.green : colors.red}${container.State}${colors.reset}`);
    console.log(`  Health: ${healthStatus}`);
    console.log(`  Container ID: ${container.ID}`);
    console.log(`  Ports: ${container.Ports || 'None'}`);
    
    if (health.status === 'unhealthy') {
      console.log(`  Health Details: ${colors.red}${health.details}${colors.reset}`);
      
      // Show container logs for unhealthy containers
      const logs = await getContainerLogs(container, 10);
      console.log(`  Recent Logs:\n${colors.dim}${logs}${colors.reset}`);
    }
  }
  
  // Check network connectivity between containers
  await checkNetworkConnectivity();
}

// Main function
async function main() {
  try {
    await displayContainerDetails();
  } catch (error) {
    console.error(`${colors.red}Error monitoring containers: ${error.message}${colors.reset}`);
  }
}

// Start the program
main();
