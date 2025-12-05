#!/bin/bash

# AthleticaOS - macOS Double-Click Restart Command
# This file can be double-clicked in macOS Finder to restart all services

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Execute the main restart script
bash "$SCRIPT_DIR/restart-all.sh"

# Keep terminal window open to view results
echo ""
echo "Press any key to close this window..."
read -n 1 -s
