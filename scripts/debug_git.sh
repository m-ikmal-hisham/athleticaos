#!/bin/bash
echo "Starting git check..."
pwd
git status > git_debug_output.txt 2>&1
echo "---" >> git_debug_output.txt
git branch --list -a >> git_debug_output.txt 2>&1
echo "Finished git check."
ls -la git_debug_output.txt
