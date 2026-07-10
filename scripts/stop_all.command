#!/bin/bash

# AthleticaOS - macOS Double-Click Stop Command
# This file can be double-clicked in macOS Finder to stop all services

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Execute the stop script
bash "$SCRIPT_DIR/stop_all.sh"

# Keep terminal window open to view results
echo ""
echo "Press any key to close this window..."
read -n 1 -s
