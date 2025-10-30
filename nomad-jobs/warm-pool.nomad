# Nomad Job Template: Warm Pool Container
#
# Purpose: Pre-warmed idle containers for fast allocation
# Type: Service (long-running, idle state)
# Duration: Indefinite (until allocated)
# Resources: 256MB RAM, 0.1 CPU (minimal for idle state)

job "warm-pool-{{ PROVIDER }}-{{ CONTAINER_ID }}" {
  # Job configuration
  type        = "service"
  datacenters = ["dc1"]
  region      = "global"
  priority    = 40  # Lower priority than active jobs

  # Job metadata
  meta {
    provider     = "{{ PROVIDER }}"
    purpose      = "warm-pool"
    container_id = "{{ CONTAINER_ID }}"
    created_at   = "{{ TIMESTAMP }}"
  }

  # Task group for warm container
  group "warm-container" {
    count = 1

    # Allow restarts to maintain pool availability
    restart {
      attempts = 3
      interval = "5m"
      delay    = "15s"
      mode     = "delay"
    }

    # Reschedule on node failure
    reschedule {
      attempts       = 3
      interval       = "10m"
      delay          = "30s"
      delay_function = "exponential"
      max_delay      = "2m"
      unlimited      = false
    }

    # Network configuration
    network {
      mode = "bridge"

      # Dynamic port allocation
      port "http" {
        to = 8080
      }
    }

    # Task: Idle Runtime Container
    task "runtime" {
      # Use Docker driver
      driver = "docker"

      # Container configuration
      config {
        # Provider-specific image
        image = "polydev-{{ PROVIDER }}-runtime:latest"

        # Keep container alive in idle state
        command = "/bin/sh"
        args    = ["-c", "tail -f /dev/null"]

        # Network mode
        network_mode = "bridge"

        # Don't force pull (use local cache)
        force_pull = false

        # Minimal logging for idle containers
        logging {
          type = "json-file"
          config {
            max-size = "5m"
            max-file = "1"
          }
        }
      }

      # Environment variables
      env {
        PROVIDER     = "{{ PROVIDER }}"
        WARM_POOL    = "true"
        CONTAINER_ID = "{{ CONTAINER_ID }}"
        STATUS       = "idle"
      }

      # Resource requirements (minimal for idle state)
      resources {
        cpu    = 100  # 0.1 CPU cores
        memory = 256  # 256 MB RAM

        # Minimal network bandwidth
        network {
          mbits = 5
        }
      }

      # Health check (ensure container is responsive)
      check {
        type     = "script"
        name     = "warm_pool_health"
        command  = "/bin/sh"
        args     = ["-c", "echo alive"]
        interval = "30s"
        timeout  = "5s"
      }

      # Kill timeout
      kill_timeout = "10s"

      # Kill signal
      kill_signal = "SIGTERM"
    }
  }
}
