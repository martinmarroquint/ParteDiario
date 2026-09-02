#!/bin/bash
# build.sh — Avoid Rust compilation issues on Render free tier
set -e

# Upgrade pip
pip install --upgrade pip

# Install pydantic-core first (force pre-built wheel, no Rust compilation)
# This avoids the "Read-only file system" Cargo error
pip install pydantic-core --only-binary=:all:

# Install the rest
pip install -r requirements.txt
