# Nomad Configuration for Polydev AI V2
# Single-node cluster with Docker driver for container orchestration
# PRODUCTION CONFIG - Tested and verified on Ubuntu 22.04

# Data directory for Nomad state
data_dir = "/opt/nomad/data"

# Bind address for all network interfaces
bind_addr = "0.0.0.0"

# Server configuration (control plane)
server {
  enabled = true

  # Bootstrap as single-node cluster
  bootstrap_expect = 1
}

# Client configuration (worker node)
client {
  enabled = true

  # Network interface for client communication
  # NOTE: Changed from eth0 to enp5s0 for Ubuntu 22.04 VPS compatibility
  network_interface = "enp5s0"

  # Resource reservations (leave headroom for system)
  reserved {
    cpu            = 1000  # 1 CPU core for system
    memory         = 1024  # 1 GB for system
    disk           = 2048  # 2 GB for system
  }
}

# Plugin configuration for Docker driver
plugin "docker" {
  config {
    allow_privileged = true

    volumes {
      enabled = true
    }

    gc {
      container = true
      dangling_containers {
        enabled = true
        period = "1h"
      }
      image = true
      image_delay = "2h"
    }
  }
}

# Telemetry configuration for Prometheus
telemetry {
  publish_allocation_metrics = true
  publish_node_metrics       = true

  # Prometheus metrics endpoint
  prometheus_metrics = true

  # Collection interval
  collection_interval = "10s"

  # Disable hostname prefix for cleaner metric names
  disable_hostname = false
}

# UI configuration
ui {
  enabled = true
}

# Ports configuration
ports {
  http = 4646  # HTTP API and UI
  rpc  = 4647  # RPC (server-to-server)
  serf = 4648  # Gossip protocol
}

# ACL configuration (disabled for single-node)
acl {
  enabled = false
}

# Log level
log_level = "INFO"

# Log file configuration
log_file = "/var/log/nomad/nomad.log"
log_rotate_bytes = 10485760  # 10 MB
log_rotate_max_files = 5
