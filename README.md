# CSMA/CA Protocol Simulator

A comprehensive visualization tool for the CSMA/CA wireless protocol, featuring real-time timeline rendering, collision simulation, and detailed statistical analysis.

## Features

- Discrete-event simulation engine for IEEE 802.15.4-style CSMA/CA protocol
- Real-time timeline visualization with node state tracking
- Collision detection and retry mechanism simulation
- Comprehensive statistics (success rate, channel utilization, latency)
- Interactive parameter configuration

## Run Locally

**Prerequisites:** Node.js (v18 or later)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Build for Production

```bash
npm run build
```

The compiled output will be in the `dist/` directory.
