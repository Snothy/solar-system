#!/bin/bash
echo "Building Solar System Simulation..."
echo "1. Compiling WASM..."
npm run build:wasm
echo "2. Building Application..."
npm run build
echo "Build Complete!"
