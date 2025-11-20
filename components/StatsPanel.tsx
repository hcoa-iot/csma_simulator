
import React from 'react';
import { SimStats } from '../types';

interface Props {
  stats: SimStats;
}

const StatCard = ({ title, value, subtext, small }: { title: string, value: string | number, subtext?: string, small?: boolean }) => (
  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium truncate" title={title}>{title}</span>
    <span className={`${small ? 'text-lg' : 'text-xl'} font-bold text-slate-800 mt-0.5`}>{value}</span>
    {subtext && <span className="text-[10px] text-gray-400 truncate" title={subtext}>{subtext}</span>}
  </div>
);

const StackedBar = ({ title, items }: { title: string, items: { label: string, value: number, color: string }[] }) => {
   const total = items.reduce((acc, i) => acc + i.value, 0);
   
   return (
     <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col w-full col-span-2 md:col-span-3">
       <div className="flex justify-between items-center mb-2">
         <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</span>
         <span className="text-[10px] text-gray-400">Total: {total}</span>
       </div>
       
       {total === 0 ? (
         <div className="h-6 w-full bg-gray-100 rounded text-[10px] flex items-center justify-center text-gray-400">No Data</div>
       ) : (
         <>
           <div className="h-6 w-full flex rounded-md overflow-hidden bg-gray-100">
             {items.map((item, idx) => {
                const pct = (item.value / total) * 100;
                if (pct === 0) return null;
                return (
                  <div 
                    key={idx} 
                    className={`${item.color} h-full flex items-center justify-center transition-all duration-500`} 
                    style={{ width: `${pct}%` }} 
                    title={`${item.label}: ${item.value} (${pct.toFixed(1)}%)`}
                  >
                     {pct > 8 && <span className="text-[10px] text-white font-bold drop-shadow-md whitespace-nowrap px-1">{pct.toFixed(0)}%</span>}
                  </div>
                );
             })}
           </div>
           <div className="flex gap-x-4 gap-y-1 mt-2 flex-wrap">
              {items.map((item, idx) => (
                 <div key={idx} className="flex items-center gap-1.5">
                   <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                   <span className="text-[10px] text-gray-500 font-medium">{item.label} <span className="text-gray-400">({item.value})</span></span>
                 </div>
              ))}
           </div>
         </>
       )}
     </div>
   );
}

const StatsPanel: React.FC<Props> = ({ stats }) => {
  const totalPackets = stats.totalPacketsGenerated || 0;
  const avgLatency = stats.successCount > 0 ? (stats.totalLatency / stats.successCount).toFixed(1) : '0';
  
  // Packet Outcome Data
  const packetOutcomes = [
    { label: '1st Try', value: stats.success1st, color: 'bg-emerald-500' },
    { label: '2nd Try', value: stats.success2nd, color: 'bg-teal-400' },
    { label: '3rd+ Try', value: stats.success3rd, color: 'bg-cyan-400' },
    { label: 'Dropped', value: stats.failureCount, color: 'bg-red-500' },
  ];

  // Channel Utilization Data
  const channelUtil = [
    { label: 'Tx (Busy)', value: stats.channelTxTicks, color: 'bg-blue-500' },
    { label: 'Collision', value: stats.channelCollisionTicks, color: 'bg-red-500' },
    { label: 'Backoff', value: stats.channelBackoffTicks, color: 'bg-yellow-400' },
    { label: 'Idle', value: stats.channelIdleTicks, color: 'bg-gray-200' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
      {/* Simple Cards Row */}
      <StatCard title="Total Success" value={stats.successCount} subtext={`of ${totalPackets} pkts`} />
      <StatCard title="Avg Latency" value={avgLatency} subtext="Slots" />
      <StatCard title="Max Queue" value={stats.maxQueueDepth} subtext="Buffered" />
      <StatCard title="Collisions" value={stats.collisionCount} subtext="Events" />
      
      {/* Stacked Bars - Taking up remaining space effectively */}
      <div className="col-span-2 md:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <StackedBar title="Packet Outcomes" items={packetOutcomes} />
        <StackedBar title="Channel Utilization (Time)" items={channelUtil} />
      </div>
    </div>
  );
};

export default StatsPanel;
