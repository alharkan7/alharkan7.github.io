#!/bin/bash
# Wrapper script for native messaging host
# Chrome requires a shell script wrapper on macOS

exec /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 "$(dirname "$0")/native_host.py"
