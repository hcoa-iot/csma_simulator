
import React, { useState, useCallback } from 'react';
import ConfigurationPanel from './components/ConfigurationPanel';
import Timeline from './components/Timeline';
import StatsPanel from './components/StatsPanel';
import LogPanel from './components/LogPanel';
import { runSimulation } from './services/simulator';
import { SimConfig, SimulationResult } from './types';

// Default Configuration
const DEFAULT_CONFIG: SimConfig = {
  slotDurationUs: 500,
  dataSlots: 10,
  ackSlots: 2, // P+FC
  collisionPenalty: 40,
  pe: 2,
  minBe: 3,
  maxBe: 5,
  maxNb: 4,
  nodeCount: 4,
  packetGenMode: 'INTERVAL',
  packetProb: 0.01,
  packetInterval: 100,
  simDuration: 500,
};

const App: React.FC = () => {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scrollTick, setScrollTick] = useState<number | null>(null);

  const handleRun = useCallback(() => {
    setIsSimulating(true);
    // Allow UI to update to "Running" state before freezing for computation
    setTimeout(() => {
      const result = runSimulation(config);
      setSimResult(result);
      setIsSimulating(false);
      setScrollTick(0); // Reset scroll
    }, 50);
  }, [config]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 font-sans">
      
      {/* Left Sidebar */}
      <ConfigurationPanel 
        config={config} 
        setConfig={setConfig} 
        onRun={handleRun} 
        isRunning={isSimulating} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {simResult ? (
          <div className="p-4 flex flex-col h-full gap-4">
            
            {/* Top Stats */}
            <div className="shrink-0">
               <StatsPanel stats={simResult.stats} />
            </div>

            {/* Middle: Timeline (Takes remaining space) */}
            <div className="flex-1 min-h-0">
              <Timeline 
                data={simResult.timeline} 
                simDuration={config.simDuration} 
                scrollToTick={scrollTick}
              />
            </div>

            {/* Bottom: Logs */}
            <div className="h-48 shrink-0 lg:h-64">
              <LogPanel 
                logs={simResult.logs} 
                onLogClick={(tick) => setScrollTick(tick)} 
              />
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-4">
             <div className="p-8 bg-white rounded-full shadow-sm">
               <svg className="w-16 h-16 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
               </svg>
             </div>
             <p className="text-lg font-medium">Ready to Simulate</p>
             <p className="text-sm">Configure parameters on the left and click "Run Simulation"</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
