# Master Controller

Central orchestration service for the CLI Remote Tool system. Manages Firecracker VMs, authentication, and prompt execution for CLI tools (Claude Code, Codex, Gemini CLI).

## Architecture

The Master Controller provides:

- **VM Management**: Firecracker VM lifecycle (create, hibernate, resume, destroy)
- **Authentication**: Browser VM automation for OAuth flows
- **Prompt Execution**: Streaming CLI responses via Server-Sent Events
- **Resource Management**: IP pool, Decodo proxy allocation
- **Background Tasks**: Automated hibernation, cleanup, monitoring
- **Metrics**: Prometheus metrics exporter
- **Admin API**: System management and monitoring

## Prerequisites

### System Requirements

- Ubuntu 22.04+ (host OS)
- Firecracker 1.13.1+ installed
- Node.js 20+
- Root access for networking and VM management
- Minimum 8GB RAM, 4 cores recommended

### Network Requirements

- Static IP address (e.g., 192.168.5.82)
- Bridge networking support
- External internet access for Decodo proxy

### Dependencies

```bash
# Install Firecracker
curl -L https://github.com/firecracker-microvm/firecracker/releases/download/v1.13.1/firecracker-v1.13.1-x86_64.tgz | tar -xz
sudo mv firecracker-v1.13.1-x86_64 /usr/bin/firecracker
sudo chmod +x /usr/bin/firecracker

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install system dependencies
sudo apt-get install -y \
    bridge-utils \
    iptables \
    debootstrap \
    rsync
```

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd master-controller
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
vim .env
```

Required environment variables:

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Encryption
ENCRYPTION_MASTER_KEY=<64-character-hex-string>

# Decodo Proxy
DECODO_USER=sp9dso1iga
DECODO_PASSWORD=GjHd8bKd3hizw05qZ=
DECODO_HOST=dc.decodo.com
DECODO_PORT_START=10001
DECODO_PORT_END=10100

# Firecracker
FIRECRACKER_BASE=/var/lib/firecracker
GOLDEN_SNAPSHOT=/var/lib/firecracker/snapshots/base/golden.snap
GOLDEN_MEMORY=/var/lib/firecracker/snapshots/base/golden.mem
GOLDEN_KERNEL=/var/lib/firecracker/snapshots/base/vmlinux
GOLDEN_ROOTFS=/var/lib/firecracker/snapshots/base/golden-rootfs.ext4
```

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Setup Database

Run the migration in your Supabase project:

```bash
# Copy migration file to your Supabase project
cp supabase/migrations/20250108000000_cli_remote_tool_schema.sql \
   /path/to/your/supabase/project/supabase/migrations/

# Apply migration
cd /path/to/your/supabase/project
npx supabase db push
```

### 5. Setup Network

```bash
sudo ./scripts/setup-network.sh
```

This creates:
- Bridge device `fcbr0` (192.168.100.1/24)
- NAT rules for VM internet access
- IP forwarding configuration

### 6. Build Golden Snapshot

```bash
sudo ./scripts/build-golden-snapshot.sh
```

This creates a base VM image with:
- Ubuntu 22.04
- Node.js 20
- CLI tools (@anthropic-ai/claude-code, @openai/codex, @google/gemini-cli)
- Puppeteer + Chromium
- VM API server

### 7. Deploy

For local deployment:

```bash
sudo systemctl enable /opt/master-controller/systemd/master-controller.service
sudo systemctl start master-controller
```

For remote deployment:

```bash
DEPLOY_HOST=192.168.5.82 ./scripts/deploy.sh
```

## Usage

### Start the Service

```bash
sudo systemctl start master-controller
```

### Check Status

```bash
sudo systemctl status master-controller
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u master-controller -f

# Last 100 lines
sudo journalctl -u master-controller -n 100
```

### Stop the Service

```bash
sudo systemctl stop master-controller
```

## API Endpoints

### Users

- `GET /api/users/:userId` - Get user details
- `POST /api/users` - Create user
- `PATCH /api/users/:userId` - Update user
- `GET /api/users/:userId/vm` - Get user's CLI VM
- `POST /api/users/:userId/vm/hibernate` - Hibernate VM
- `POST /api/users/:userId/vm/resume` - Resume VM
- `DELETE /api/users/:userId/vm` - Destroy VM
- `GET /api/users/:userId/stats` - Get user statistics

### Authentication

- `POST /api/auth/start` - Start authentication for provider
- `GET /api/auth/session/:sessionId` - Get session status
- `POST /api/auth/session/:sessionId/cancel` - Cancel session
- `POST /api/auth/rotate` - Rotate credentials
- `GET /api/auth/credentials/:userId` - List credentials
- `GET /api/auth/validate/:userId/:provider` - Validate credentials

### Prompts

- `POST /api/prompts/execute` - Execute prompt (streaming SSE)
- `POST /api/prompts/:promptId/cancel` - Cancel prompt
- `GET /api/prompts/:promptId/status` - Get prompt status

### VMs

- `GET /api/vms` - List all VMs
- `GET /api/vms/:vmId` - Get VM details
- `POST /api/vms/:vmId/heartbeat` - Update heartbeat
- `GET /api/vms/statistics/summary` - Get VM statistics

### Admin

- `GET /api/admin/users` - List all users
- `GET /api/admin/system/stats` - Get system statistics
- `POST /api/admin/users/:userId/force-destroy-vm` - Force destroy VM
- `POST /api/admin/cleanup/inactive-vms` - Cleanup inactive VMs
- `POST /api/admin/cleanup/orphaned-resources` - Cleanup orphaned resources
- `GET /api/admin/metrics/recent` - Get recent metrics

### Metrics

- `GET /metrics` - Prometheus metrics
- `GET /metrics/json` - JSON metrics (debugging)

## WebSocket API

Connect to `ws://host:4000` for real-time updates.

### Subscribe to Events

```json
{
  "type": "subscribe",
  "payload": {
    "channel": "user:USER_ID"
  }
}
```

### Event Types

- `vm_crashed` - VM crash detected
- `prompt_completed` - Prompt execution completed
- `auth_completed` - Authentication completed

## Background Tasks

The Master Controller runs several automated background tasks:

### VM Hibernation (every 5 minutes)
- Hibernates VMs idle > 30 minutes
- Saves memory state to disk
- Reduces resource usage

### VM Destruction (daily at 2 AM)
- Destroys VMs inactive > 2 weeks
- Frees up resources
- Notifies users

### Metrics Collection (every 10 minutes)
- Records system metrics
- VM statistics
- IP pool usage
- Prompt counts

### Auth Session Cleanup (hourly)
- Removes stale auth sessions
- Destroys orphaned browser VMs
- Timeouts after 2 hours

### Credential Validation (every 6 hours)
- Validates stored credentials
- Marks invalid credentials
- Triggers rotation if needed

### VM Health Check (every minute)
- Detects crashed VMs
- Updates VM status
- Sends crash notifications

## Monitoring

### Prometheus Metrics

Access metrics at `http://host:4000/metrics`

Key metrics:
- `polydev_total_users` - Total users
- `polydev_total_vms` - Total VMs (by status, type)
- `polydev_active_vms` - Active VMs
- `polydev_prompts_total` - Total prompts
- `polydev_prompt_duration_seconds` - Prompt duration histogram
- `polydev_vm_resource_usage` - VM CPU/memory usage
- `polydev_ip_pool_available` - Available IPs
- `polydev_decodo_ports_used` - Decodo ports in use

### Grafana Dashboard

Import the provided Grafana dashboard for visualization.

## Troubleshooting

### VM Creation Fails

```bash
# Check Firecracker installation
firecracker --version

# Check bridge device
ip link show fcbr0

# Check IP pool
# (requires accessing Master Controller internal state)

# Check golden snapshot
ls -lh /var/lib/firecracker/snapshots/base/
```

### Authentication Fails

```bash
# Check browser VM logs
journalctl -u master-controller | grep browser

# Verify Decodo proxy
curl -x http://user:pass@dc.decodo.com:10001 https://api.ipify.org

# Check credentials encryption
# (check database provider_credentials table)
```

### Network Issues

```bash
# Verify bridge
ip addr show fcbr0

# Check NAT rules
iptables -t nat -L POSTROUTING -n -v

# Test VM connectivity
ping -c 3 192.168.100.10
```

### Service Won't Start

```bash
# Check logs
journalctl -u master-controller -n 50

# Verify environment
cat /opt/master-controller/.env

# Check database connection
# (should appear in logs on startup)

# Verify permissions
ls -l /var/lib/firecracker
ls -l /var/log/polydev
```

## Development

### Run Locally

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

## Security

### Encryption

- Credentials encrypted with AES-256-GCM
- Master key stored in environment (not in database)
- Scrypt key derivation with random salt
- Authentication tags for integrity

### Network Isolation

- VMs in isolated network namespace
- Bridge networking with NAT
- No direct host access
- Firecracker jailer for additional isolation

### Resource Limits

- Maximum concurrent VMs: 180
- IP pool: 253 addresses
- Decodo ports: 10001-10100 (expandable)
- Rate limiting on API endpoints

## License

Proprietary - Polydev AI

## Support

For issues, contact: support@polydev.ai
