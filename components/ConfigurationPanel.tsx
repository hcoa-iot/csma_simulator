
import React from 'react';
import { SimConfig } from '../types';

interface Props {
  config: SimConfig;
  setConfig: (c: SimConfig) => void;
  onRun: () => void;
  isRunning: boolean;
}

const ConfigurationPanel: React.FC<Props> = ({ config, setConfig, onRun, isRunning }) => {
  const handleChange = (key: keyof SimConfig, val: string) => {
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    setConfig({ ...config, [key]: num });
  };

  const handleModeChange = (mode: 'RANDOM' | 'INTERVAL') => {
    setConfig({ ...config, packetGenMode: mode });
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-20">
      <div className="p-4 border-b border-gray-200 bg-slate-800 text-white">
        <h1 className="text-xl font-bold">CSMA/CA Simulator</h1>
        <p className="text-xs text-gray-300 mt-1">Protocol Visualization Tool</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Control Group */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Simulation Control</h3>
           <button
            onClick={onRun}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Simulation
              </>
            )}
          </button>
        </div>

        {/* Global Params */}
        <div className="space-y-3">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Global Parameters</h3>
           
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="block text-xs font-medium text-gray-700">Duration (Slots)</label>
               <input 
                 type="number" 
                 value={config.simDuration}
                 onChange={(e) => handleChange('simDuration', e.target.value)}
                 className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700">Slot Time (µs)</label>
               <input 
                 type="number" 
                 value={config.slotDurationUs}
                 onChange={(e) => handleChange('slotDurationUs', e.target.value)}
                 className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
               />
             </div>
           </div>
           <div>
             <label className="block text-xs font-medium text-gray-700">Node Count</label>
             <input 
               type="number" 
               value={config.nodeCount}
               onChange={(e) => handleChange('nodeCount', e.target.value)}
               className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
             />
           </div>
        </div>

        {/* Packet Generation */}
        <div className="space-y-3">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Traffic Generation</h3>
           
           <div className="flex gap-2 text-xs">
             <button 
               className={`flex-1 py-1.5 px-2 rounded border ${config.packetGenMode === 'RANDOM' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-gray-300'}`}
               onClick={() => handleModeChange('RANDOM')}
             >
               Random (Prob)
             </button>
             <button 
               className={`flex-1 py-1.5 px-2 rounded border ${config.packetGenMode === 'INTERVAL' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-gray-300'}`}
               onClick={() => handleModeChange('INTERVAL')}
             >
               Fixed (Interval)
             </button>
           </div>

           {config.packetGenMode === 'RANDOM' ? (
             <div>
               <label className="block text-xs font-medium text-gray-700">Probability (per tick)</label>
               <input 
                 type="number" step="0.001" min="0" max="1"
                 value={config.packetProb}
                 onChange={(e) => handleChange('packetProb', e.target.value)}
                 className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
               />
             </div>
           ) : (
             <div>
               <label className="block text-xs font-medium text-gray-700">Interval (Slots)</label>
               <input 
                 type="number" min="1"
                 value={config.packetInterval}
                 onChange={(e) => handleChange('packetInterval', e.target.value)}
                 className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
               />
               <p className="text-[10px] text-gray-400 mt-1">All nodes generate at fixed intervals (Simultaneous).</p>
             </div>
           )}
        </div>

        {/* Frame Params */}
        <div className="space-y-3">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Frame Structure</h3>
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="block text-xs font-medium text-gray-700">Data Length</label>
               <input type="number" value={config.dataSlots} onChange={(e) => handleChange('dataSlots', e.target.value)} className="mt-1 w-full rounded-md bg-gray-50 border-gray-300 p-2 border text-sm" />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700">Collision VCS</label>
               <input type="number" value={config.collisionPenalty} onChange={(e) => handleChange('collisionPenalty', e.target.value)} className="mt-1 w-full rounded-md bg-gray-50 border-gray-300 p-2 border text-sm" />
             </div>
           </div>
        </div>

        {/* Backoff Params */}
        <div className="space-y-3">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Backoff Algorithm</h3>
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="block text-xs font-medium text-gray-700">Min BE</label>
               <input type="number" value={config.minBe} onChange={(e) => handleChange('minBe', e.target.value)} className="mt-1 w-full rounded-md bg-gray-50 border-gray-300 p-2 border text-sm" />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700">Max BE</label>
               <input type="number" value={config.maxBe} onChange={(e) => handleChange('maxBe', e.target.value)} className="mt-1 w-full rounded-md bg-gray-50 border-gray-300 p-2 border text-sm" />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700">Max Retries (NB)</label>
               <input type="number" value={config.maxNb} onChange={(e) => handleChange('maxNb', e.target.value)} className="mt-1 w-full rounded-md bg-gray-50 border-gray-300 p-2 border text-sm" />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700">Priority (PE)</label>
               <input type="number" value={config.pe} onChange={(e) => handleChange('pe', e.target.value)} className="mt-1 w-full rounded-md bg-gray-50 border-gray-300 p-2 border text-sm" />
             </div>
           </div>
        </div>

      </div>
      <div className="p-4 bg-gray-100 border-t border-gray-200 text-xs text-center text-gray-500">
        Simulating CSMA/CA Protocol
      </div>
    </div>
  );
};

export default ConfigurationPanel;
