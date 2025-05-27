/**
 * Generate fictive AWS server documentation
 * 
 * This script generates 100 markdown files with fictive AWS server information
 */

const fs = require('fs');
const path = require('path');

const SERVERS_COUNT = 100;
const OUTPUT_DIR = path.join(__dirname, 'content', 'aws-servers');

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// AWS regions
const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2',
  'sa-east-1'
];

// Server types
const instanceTypes = [
  't3.micro', 't3.small', 't3.medium', 't3.large',
  'm5.large', 'm5.xlarge', 'm5.2xlarge',
  'c5.large', 'c5.xlarge', 'c5.2xlarge',
  'r5.large', 'r5.xlarge', 'r5.2xlarge',
  'g4dn.xlarge', 'p3.2xlarge'
];

// Workloads
const workloads = [
  'Web Server', 'Database', 'Application Server', 'Cache', 
  'Message Queue', 'CI/CD Runner', 'Monitoring', 'Data Processing',
  'Analytics', 'Machine Learning', 'Development', 'Testing',
  'Production', 'Backup', 'Storage'
];

// OS Types
const operatingSystems = [
  'Amazon Linux 2', 'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS',
  'RHEL 8', 'RHEL 9', 'CentOS 7',
  'Windows Server 2019', 'Windows Server 2022'
];

// Status
const statuses = ['Running', 'Stopped', 'Pending', 'Terminated', 'Stopping'];

// Generate a random server name
function generateServerName() {
  const prefixes = ['prod', 'dev', 'test', 'stage', 'qa', 'uat', 'perf'];
  const services = ['web', 'app', 'db', 'cache', 'queue', 'auth', 'api', 'worker', 'monitor', 'backup'];
  const suffix = Math.floor(Math.random() * 999) + 1;
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const service = services[Math.floor(Math.random() * services.length)];
  
  return `${prefix}-${service}-${suffix}`;
}

// Generate markdown content for a server
function generateServerContent(id) {
  const serverName = generateServerName();
  const instanceId = `i-${Math.random().toString(36).substring(2, 10)}`;
  const region = regions[Math.floor(Math.random() * regions.length)];
  const instanceType = instanceTypes[Math.floor(Math.random() * instanceTypes.length)];
  const workload = workloads[Math.floor(Math.random() * workloads.length)];
  const os = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const launchDate = new Date(
    2020 + Math.floor(Math.random() * 5),
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28) + 1
  ).toISOString().split('T')[0];
  
  return `# ${serverName} (AWS Server ${id})

## Server Details

| Property | Value |
|----------|-------|
| Instance ID | \`${instanceId}\` |
| Region | ${region} |
| Instance Type | ${instanceType} |
| Status | ${status} |
| Launch Date | ${launchDate} |
| Operating System | ${os} |
| Primary Workload | ${workload} |

## Server Description

This server is used for ${workload.toLowerCase()} purposes in our ${region} infrastructure. 
It was provisioned on ${launchDate} and is currently in ${status.toLowerCase()} state.

## Configuration

### Hardware Configuration

- vCPUs: ${instanceType.includes('micro') ? 1 : (instanceType.includes('small') ? 2 : (instanceType.includes('medium') ? 4 : 8))}
- Memory: ${instanceType.includes('micro') ? '1 GiB' : (instanceType.includes('small') ? '2 GiB' : (instanceType.includes('medium') ? '4 GiB' : '16 GiB'))}
- Storage: ${Math.floor(Math.random() * 500) + 20} GB ${Math.random() > 0.5 ? 'SSD' : 'HDD'}
- Network: ${Math.random() > 0.7 ? 'High' : 'Moderate'} Performance

### Software Configuration

- Operating System: ${os}
- Runtime Environment: ${Math.random() > 0.5 ? 'Production' : 'Development/Testing'}
${Math.random() > 0.5 ? '- Load Balancer: Attached' : '- Load Balancer: Not attached'}
${Math.random() > 0.5 ? '- Auto Scaling: Enabled' : '- Auto Scaling: Disabled'}
${Math.random() > 0.6 ? '- Monitoring: Enhanced' : '- Monitoring: Basic'}

## Security

- Security Groups: ${serverName}-sg
- IAM Role: ${serverName.split('-')[0]}-${serverName.split('-')[1]}-role
- SSH Key: ${serverName.split('-')[0]}-key-${region}
${Math.random() > 0.5 ? '- Additional Security: VPC Endpoint configured' : '- Additional Security: Standard'}

## Network

- VPC: vpc-${Math.random().toString(36).substring(2, 10)}
- Subnet: subnet-${Math.random().toString(36).substring(2, 10)}
- Private IP: 10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}
${Math.random() > 0.5 ? '- Public IP: ' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255) : '- Public IP: None (Internal only)'}

## Maintenance

- Scheduled Maintenance: ${['Weekly', 'Monthly', 'Quarterly', 'Yearly'][Math.floor(Math.random() * 4)]}
- Backup Schedule: ${['Daily', 'Weekly', 'Bi-weekly', 'Monthly'][Math.floor(Math.random() * 4)]}
- Responsible Team: ${['DevOps', 'Infrastructure', 'Platform', 'Cloud'][Math.floor(Math.random() * 4)]}
- Contact: ${['devops', 'infra', 'platform', 'cloud'][Math.floor(Math.random() * 4)]}@example.com

## Cost Information

- Monthly Cost: Approximately $${Math.floor(Math.random() * 300) + 50}
- Cost Center: ${['IT-INFRA', 'IT-DEV', 'PROD', 'R&D'][Math.floor(Math.random() * 4)]}-${Math.floor(Math.random() * 1000) + 100}
- Project Code: ${['PC', 'PRJ', 'INF', 'DEV'][Math.floor(Math.random() * 4)]}-${Math.floor(Math.random() * 10000) + 1000}
`;
}

// Generate the server documentation files
console.log(`Generating documentation for ${SERVERS_COUNT} AWS servers...`);
for (let i = 1; i <= SERVERS_COUNT; i++) {
  const content = generateServerContent(i);
  const fileName = `aws-server-${i.toString().padStart(3, '0')}.md`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  fs.writeFileSync(filePath, content);
  
  // Progress indicator
  if (i % 10 === 0 || i === SERVERS_COUNT) {
    console.log(`Generated ${i}/${SERVERS_COUNT} server documentation files`);
  }
}

console.log('Documentation generation complete!');
