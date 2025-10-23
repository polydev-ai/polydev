#!/bin/bash
#
# Browser VM Cleanup Script
# Run this on the mini PC (backspace@192.168.10.133) to clean up all stuck Firecracker VMs
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

log_info "Starting Browser VM cleanup..."

# Step 1: Kill all Firecracker processes
log_info "Step 1: Killing all Firecracker processes..."
FIRECRACKER_PIDS=$(pgrep -f firecracker || true)
if [ -n "$FIRECRACKER_PIDS" ]; then
    log_warn "Found Firecracker processes: $FIRECRACKER_PIDS"
    for PID in $FIRECRACKER_PIDS; do
        log_info "Killing Firecracker PID: $PID"
        kill -9 "$PID" || log_warn "Failed to kill PID $PID"
    done
else
    log_info "No Firecracker processes found"
fi

# Step 2: Remove all VM directories
log_info "Step 2: Cleaning up VM directories..."
VM_BASE_DIR="/var/lib/firecracker/vms"
if [ -d "$VM_BASE_DIR" ]; then
    VM_COUNT=$(find "$VM_BASE_DIR" -maxdepth 1 -type d -name "vm-*" | wc -l)
    if [ "$VM_COUNT" -gt 0 ]; then
        log_warn "Found $VM_COUNT VM directories"
        find "$VM_BASE_DIR" -maxdepth 1 -type d -name "vm-*" -exec rm -rf {} \; || log_warn "Some VM dirs failed to delete"
        log_info "VM directories cleaned"
    else
        log_info "No VM directories found"
    fi
else
    log_warn "VM base directory not found: $VM_BASE_DIR"
fi

# Step 3: Remove all Firecracker sockets
log_info "Step 3: Cleaning up Firecracker sockets..."
SOCKET_DIR="/var/run/firecracker"
if [ -d "$SOCKET_DIR" ]; then
    SOCKET_COUNT=$(find "$SOCKET_DIR" -name "vm-*.sock" | wc -l)
    if [ "$SOCKET_COUNT" -gt 0 ]; then
        log_warn "Found $SOCKET_COUNT socket files"
        find "$SOCKET_DIR" -name "vm-*.sock" -delete || log_warn "Some sockets failed to delete"
        log_info "Socket files cleaned"
    else
        log_info "No socket files found"
    fi
else
    log_warn "Socket directory not found: $SOCKET_DIR"
fi

# Step 4: Remove all TAP devices
log_info "Step 4: Cleaning up TAP devices..."
TAP_DEVICES=$(ip link show | grep -oP 'fc-vm-[a-f0-9]{8}' || true)
if [ -n "$TAP_DEVICES" ]; then
    log_warn "Found TAP devices:"
    echo "$TAP_DEVICES"
    for TAP in $TAP_DEVICES; do
        log_info "Removing TAP device: $TAP"
        ip link delete "$TAP" 2>/dev/null || log_warn "Failed to remove $TAP (may already be gone)"
    done
else
    log_info "No TAP devices found"
fi

# Step 5: Check master-controller status
log_info "Step 5: Checking master-controller service..."
if systemctl is-active --quiet master-controller; then
    log_info "master-controller is running"
    log_warn "You may want to restart it after cleanup: sudo systemctl restart master-controller"
else
    log_warn "master-controller is NOT running"
    log_info "Start it with: sudo systemctl start master-controller"
fi

# Step 6: Summary
log_info "Cleanup complete!"
log_info ""
log_info "Next steps:"
log_info "  1. Restart master-controller: sudo systemctl restart master-controller"
log_info "  2. Check logs: journalctl -u master-controller -f"
log_info "  3. Try launching a new Browser VM from the dashboard"

