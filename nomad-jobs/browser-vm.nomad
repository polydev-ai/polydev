# Nomad Job Template: Browser VM
#
# Purpose: Run Firecracker microVM for browser-based OAuth flows
# Type: Service (long-running, persistent)
# Duration: 5-30 minutes
# Resources: 2GB RAM, 1 CPU

job "browser-vm-{{ SESSION_ID }}" {
  # Job configuration
  type        = "service"
  datacenters = ["dc1"]
  region      = "global"
  priority    = 75  # Higher priority than runtime containers

  # Job metadata
  meta {
    user_id    = "{{ USER_ID }}"
    session_id = "{{ SESSION_ID }}"
    provider   = "{{ PROVIDER }}"
    purpose    = "browser-vm"
    vm_ip      = "{{ VM_IP }}"
    vnc_port   = "{{ VNC_PORT }}"
    timestamp  = "{{ TIMESTAMP }}"
  }

  # Task group for browser VM
  group "browser-vm" {
    count = 1

    # Allow limited restarts for transient failures
    restart {
      attempts = 2
      interval = "5m"
      delay    = "15s"
      mode     = "fail"
    }

    # Reschedule policy for node failures
    reschedule {
      attempts  = 0
      unlimited = false
    }

    # Network configuration
    network {
      mode = "host"  # Host mode for Firecracker TAP networking

      # VNC port mapping
      port "vnc" {
        static = {{ VNC_PORT }}
        to     = 5900
      }

      # noVNC WebSocket port
      port "websocket" {
        static = {{ WEBSOCKET_PORT }}
        to     = 6080
      }
    }

    # Task: Firecracker microVM
    task "firecracker-vm" {
      # Use exec driver for Firecracker binary
      driver = "exec"

      # Firecracker configuration
      config {
        command = "/usr/local/bin/firecracker"
        args = [
          "--api-sock", "/var/lib/firecracker/sockets/{{ SESSION_ID }}.sock",
          "--config-file", "/var/lib/firecracker/configs/{{ SESSION_ID }}.json"
        ]
      }

      # Environment variables
      env {
        SESSION_ID = "{{ SESSION_ID }}"
        USER_ID    = "{{ USER_ID }}"
        PROVIDER   = "{{ PROVIDER }}"
        VM_IP      = "{{ VM_IP }}"
        VNC_PORT   = "{{ VNC_PORT }}"
      }

      # Resource requirements (VMs need more resources)
      resources {
        cpu    = 1000  # 1 CPU core
        memory = 2048  # 2 GB RAM

        # Network bandwidth
        network {
          mbits = 100
        }
      }

      # Volume mounts for Firecracker
      volume_mount {
        volume      = "firecracker-snapshots"
        destination = "/var/lib/firecracker/snapshots"
        read_only   = true
      }

      volume_mount {
        volume      = "vm-data"
        destination = "/var/lib/firecracker/vms"
        read_only   = false
      }

      # Lifecycle: Clean up socket on stop
      lifecycle {
        hook    = "poststop"
        sidecar = false
      }

      # Kill timeout (allow graceful VM shutdown)
      kill_timeout = "60s"

      # Kill signal
      kill_signal = "SIGTERM"
    }

    # Volume declarations
    volume "firecracker-snapshots" {
      type      = "host"
      source    = "firecracker-snapshots"
      read_only = true
    }

    volume "vm-data" {
      type      = "host"
      source    = "vm-data"
      read_only = false
    }
  }
}
