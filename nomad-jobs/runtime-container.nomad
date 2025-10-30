# Nomad Job Template: Runtime Container
#
# Purpose: Execute CLI commands in isolated containers for OpenAI/Anthropic/Google
# Type: Batch (one-off execution)
# Duration: 1-5 minutes
# Resources: 512MB RAM, 0.5 CPU

job "runtime-{{ PROVIDER }}-{{ USER_ID }}-{{ TIMESTAMP }}" {
  # Job configuration
  type        = "batch"
  datacenters = ["dc1"]
  region      = "global"
  priority    = 50

  # Job metadata
  meta {
    user_id   = "{{ USER_ID }}"
    provider  = "{{ PROVIDER }}"
    purpose   = "cli-execution"
    timestamp = "{{ TIMESTAMP }}"
  }

  # Task group for runtime execution
  group "runtime" {
    count = 1

    # No automatic restarts for batch jobs
    restart {
      attempts = 0
      mode     = "fail"
    }

    # Network configuration
    network {
      mode = "bridge"

      # Dynamic ports
      port "http" {
        to = 8080
      }
    }

    # Task: CLI Execution
    task "cli-execution" {
      # Use Docker driver
      driver = "docker"

      # Container configuration
      config {
        # Provider-specific image
        image = "polydev-{{ PROVIDER }}-runtime:latest"

        # Command execution
        command = "/bin/sh"
        args    = ["-c", "{{ COMMAND }}"]

        # Network mode
        network_mode = "bridge"

        # Force pull image (set to false for local images)
        force_pull = false

        # Logging configuration
        logging {
          type = "json-file"
          config {
            max-size = "10m"
            max-file = "2"
          }
        }

        # Mount volumes if needed
        # volumes = [
        #   "/tmp/runtime:/tmp/runtime"
        # ]
      }

      # Environment variables (credentials injected here)
      env {
        PROVIDER = "{{ PROVIDER }}"
        USER_ID  = "{{ USER_ID }}"

        # Provider-specific credentials (injected by master-controller)
        # OPENAI_API_KEY     = "{{ OPENAI_API_KEY }}"
        # ANTHROPIC_API_KEY  = "{{ ANTHROPIC_API_KEY }}"
        # GOOGLE_API_KEY     = "{{ GOOGLE_API_KEY }}"

        # Additional environment variables
        # {{ ADDITIONAL_ENV }}
      }

      # Resource requirements
      resources {
        cpu    = 500  # 0.5 CPU cores
        memory = 512  # 512 MB RAM

        # Network bandwidth
        network {
          mbits = 10
        }
      }

      # Lifecycle configuration
      lifecycle {
        hook    = "poststop"
        sidecar = false
      }

      # Kill timeout
      kill_timeout = "30s"

      # Container kill signal
      kill_signal = "SIGTERM"
    }
  }
}
