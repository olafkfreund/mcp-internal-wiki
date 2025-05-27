# Enhanced Test Tools

This document describes the enhanced testing tools added to the MCP Private Wiki Authentication POC.

## New Tools

### Test Runner Menu

A comprehensive menu-driven tool for managing and testing the POC:

```bash
npm run menu
```

This interactive menu provides the following options:

1. Run Authentication Tests
2. Run Interactive Client
3. Run Quick Test
4. Check Container Status
5. Restart Containers
6. Run Verbose Tests
q. Quit

### Container Health Monitor

A detailed tool for monitoring the health of Docker containers:

```bash
npm run monitor
```

This tool provides:

- Container status (running/stopped)
- Health check status
- Network connectivity tests between containers
- Container logs for unhealthy containers

### Quick Test

A one-liner to quickly test the MCP server's ability to retrieve authenticated wiki content:

```bash
npm run quicktest
```

This will send a predefined query to the MCP server and display the results.

## Test Scripts Improvements

The test scripts have been enhanced with:

### 1. Retry Logic

All HTTP requests now include built-in retry logic with exponential backoff:

```javascript
async function axiosWithRetry(config, maxRetries = 3, delay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await axios(config);
    } catch (error) {
      // ... retry logic ...
    }
  }
}
```

### 2. Service Readiness Detection

Dynamic detection of service readiness instead of fixed delays:

```javascript
async function checkServiceReadiness(url, maxRetries = 5, delay = 2000) {
  // Actively check if service is ready
}
```

### 3. Comprehensive Test Results

Detailed test results summary that clearly shows which aspects of authentication are working:

```
=== POC Test Results ===
Markdown server authentication: ✓
Markdown server with credentials: ✓
MCP server wiki access: ✓
✅ All tests passed successfully! The POC is working correctly.
🔒 Private wiki authentication is working properly.
```

### 4. Improved Error Handling

Better error messages and diagnostics when something fails.

## Using the New Tools

### For Initial Testing

Run the menu-driven interface:

```bash
npm run menu
```

### For Continuous Monitoring

Use the container monitoring tool:

```bash
npm run monitor
```

### For Quick API Testing

Use the quick test command:

```bash
npm run quicktest
```

### For Detailed Test Logs

Use the verbose test mode:

```bash
npm run test:verbose
```
