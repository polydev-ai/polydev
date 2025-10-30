# Nomad Configuration for Polydev AI V2
# Single-node cluster with Docker driver for container orchestration

# Data directory for Nomad state
data_dir = "/opt/nomad/data"

# Bind address for all network interfaces
bind_addr = "0.0.0.0"

# Server configuration (control plane)
server {
  enabled = true

  # Bootstrap as single-node cluster
  bootstrap_expect = 1

  # Enable server scheduling
  enabled_schedulers = ["batch", "service", "system"]

  # Default scheduler configuration
  default_scheduler_config {
    # Enable preemption for batch jobs
    preemption_config {
      batch_scheduler_enabled   = true
      service_scheduler_enabled = false
      system_scheduler_enabled  = false
    }
  }
}

# Client configuration (worker node)
client {
  enabled = true

  # Network interface for client communication
  network_interface = "eth0"

  # Resource reservations (leave headroom for system)
  reserved {
    cpu            = 1000  # 1 CPU core for system
    memory         = 1024  # 1 GB for system
    disk           = 2048  # 2 GB for system
  }

  # Host volumes for container mounts
  host_volume "firecracker-snapshots" {
    path      = "/var/lib/firecracker/snapshots"
    read_only = true
  }

  host_volume "vm-data" {
    path      = "/var/lib/firecracker/vms"
    read_only = false
  }
}

# Plugin configuration for Docker driver
plugin "docker" {
  config {
    enabled = true

    # Allow privileged containers for VM management
    allow_privileged = true

    # Docker volumes configuration
    volumes {
      enabled = true
    }

    # Resource limits
    gc {
      # Clean up stopped containers after 1 hour
      container = true
      container_gc_interval = "1h"

      # Clean up unused images after 2 hours
      image = true
      image_delay = "2h"
    }

    # Pull timeout for images
    pull_activity_timeout = "10m"

    # Authentication for private registries (if needed)
    # auth {
    #   config = "/etc/docker/config.json"
    # }
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

  # Consul integration (disabled for now)
  consul {
    ui_url = ""
  }

  # Vault integration (disabled for now)
  vault {
    ui_url = ""
  }
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

# Enable syslog
enable_syslog = false

# Log file configuration
log_file = "/var/log/nomad/nomad.log"
log_rotate_bytes = 10485760  # 10 MB
log_rotate_max_files = 5
