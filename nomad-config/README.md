# Phase 2: Nomad Orchestration Setup

This directory contains configuration files and scripts for installing and configuring Nomad on the Polydev AI VPS.

## Overview

Nomad replaces direct Firecracker VM management with a proper container orchestration system, enabling:
- Better resource management
- Container warm pools for fast allocation
- Automated scaling and lifecycle management
- Integration with Docker for runtime containers

## Files

- `nomad.hcl` - Nomad configuration file (server + client mode)
- `nomad.service` - Systemd service unit for Nomad
- `../scripts/install-nomad.sh` - Installation script

## Installation on VPS (135.181.138.102)

### Prerequisites

- Ubuntu 22.04 LTS
- Root access via SSH
- At least 4GB RAM, 2 CPU cores
- 20GB available disk space

### Installation Steps

1. **Copy files to VPS**:
```bash
# From your local machine
cd /Users/venkat/Documents/polydev-ai
scp -r nomad-config root@135.181.138.102:/tmp/
scp scripts/install-nomad.sh root@135.181.138.102:/tmp/
```

2. **SSH into VPS**:
```bash
ssh root@135.181.138.102
```

3. **Run installation script**:
```bash
cd /tmp
chmod +x install-nomad.sh
./install-nomad.sh
```

The script will:
- Install Docker (if not already installed)
- Download and install Nomad v1.7.3
- Create necessary directories
- Install configuration files
- Set up systemd service
- Start and verify Nomad

### Verify Installation

After installation completes:

```bash
# Check service status
systemctl status nomad

# View Nomad server members
nomad server members

# View Nomad client nodes
nomad node status

# Check metrics endpoint
curl http://localhost:4646/v1/metrics
```

### Access Nomad UI

Open your browser and navigate to:
```
http://135.181.138.102:4646
```

## Configuration Details

### Ports

- **4646** - HTTP API and Web UI
- **4647** - RPC (inter-server communication)
- **4648** - Serf (gossip protocol)

### Directories

- `/opt/nomad/data` - Nomad state and data
- `/etc/nomad.d/` - Configuration files
- `/var/log/nomad/` - Log files
- `/var/lib/firecracker/snapshots` - Mounted as host volume
- `/var/lib/firecracker/vms` - Mounted as host volume

### Resource Reservations

The configuration reserves resources for the host system:
- 1 CPU core
- 1GB RAM
- 2GB disk

Remaining resources are available for Nomad jobs.

## Telemetry & Monitoring

Nomad exposes Prometheus-compatible metrics at:
```
http://localhost:4646/v1/metrics?format=prometheus
```

Metrics include:
- Allocation metrics (container lifecycle)
- Node metrics (resource usage)
- Job scheduling metrics
- Docker driver metrics

These will be scraped by Prometheus in Phase 6.

## Troubleshooting

### Nomad service won't start

```bash
# Check logs
journalctl -u nomad -n 50 --no-pager

# Check configuration syntax
nomad config validate /etc/nomad.d/nomad.hcl
```

### Docker plugin not loading

```bash
# Ensure Docker is running
systemctl status docker

# Check Nomad logs for Docker plugin errors
journalctl -u nomad | grep -i docker
```

### Node not joining cluster

```bash
# Check firewall rules (should allow ports 4646-4648)
ufw status

# Verify network connectivity
nomad server members
nomad node status
```

## Next Steps

After Nomad is installed and running:

1. **Create Nomad Manager Service** - Node.js service in master-controller to submit jobs
2. **Create Warm Pool Manager** - Pre-warm containers for fast allocation
3. **Create Nomad Job Templates** - Job definitions for browser VMs and runtime containers
4. **Build Docker Images** - Runtime containers for OpenAI/Anthropic/Google (Phase 5)
5. **Deploy Warm Pool** - Submit warm pool jobs to Nomad

## Useful Commands

```bash
# View all jobs
nomad job status

# View job details
nomad job status <job-id>

# Stop a job
nomad job stop <job-id>

# View allocations (running containers)
nomad alloc status

# View node resources
nomad node status -self

# Tail Nomad logs
journalctl -u nomad -f

# Restart Nomad
systemctl restart nomad
```

## Security Notes

- Nomad ACL is currently **disabled** for simplicity (single-node cluster)
- Docker privileged mode is **enabled** for VM management
- Consider enabling ACL for production with multiple users
- Firewall rules should restrict Nomad ports to trusted IPs

## References

- [Nomad Documentation](https://www.nomadproject.io/docs)
- [Nomad Docker Driver](https://www.nomadproject.io/docs/drivers/docker)
- [Nomad Telemetry](https://www.nomadproject.io/docs/configuration/telemetry)
- [Nomad Job Specification](https://www.nomadproject.io/docs/job-specification)
