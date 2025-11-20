import React, { useState } from 'react';
import { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  onLogClick: (tick: number) => void;
}

const LogPanel: React.FC<Props> = ({ logs, onLogClick }) => {
  const [filter, setFilter] = useState('');
  
  const filteredLogs = logs.filter(l => 
    filter === '' || 
    l.message.toLowerCase().includes(filter.toLowerCase()) || 
    l.type.toLowerCase().includes(filter.toLowerCase()) ||
    `N${l.nodeId}`.toLowerCase().includes(filter.toLowerCase())
  );

  // Limit display to last 1000 logs for performance if needed, but virtualization is better. 
  // For this scope, standard mapping is okay given sim duration limits.
  
  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'COLLISION': return 'text-red-600 bg-red-50';
      case 'SUCCESS': return 'text-green-600 bg-green-50';
      case 'DROP': return 'text-red-800 font-bold bg-red-100';
      case 'VCS': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-64 lg:h-full">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg">
        <h3 className="font-bold text-gray-700 text-sm">Event Log</h3>
        <input 
          type="text" 
          placeholder="Filter logs..." 
          className="text-xs p-1.5 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 w-40"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="overflow-y-auto p-0 flex-1 font-mono text-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 sticky top-0 text-gray-500">
            <tr>
              <th className="p-2 w-16">Tick</th>
              <th className="p-2 w-12">Node</th>
              <th className="p-2 w-20">Type</th>
              <th className="p-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400 italic">No events found.</td>
              </tr>
            ) : (
              filteredLogs.map((log, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => onLogClick(log.tick)}
                  className={`border-b border-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${getTypeColor(log.type)}`}
                >
                  <td className="p-2 font-bold text-slate-500">T={log.tick}</td>
                  <td className="p-2 font-bold">N{log.nodeId}</td>
                  <td className="p-2 font-semibold">{log.type}</td>
                  <td className="p-2">{log.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogPanel;