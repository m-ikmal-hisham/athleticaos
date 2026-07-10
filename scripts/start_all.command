#!/bin/bash

# AthleticaOS - macOS Double-Click Start Command
# This file can be double-clicked in macOS Finder to start all services

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Execute the start script
bash "$SCRIPT_DIR/start_all.sh"

# Keep terminal window open ensuring users see the final status
echo ""
echo "Services started in background."
echo "Press any key to close this window..."
read -n 1 -s
