
import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { TimelineData, NodeType, TimelineCell } from '../types';

interface Props {
  data: TimelineData;
  simDuration: number;
  scrollToTick: number | null;
}

const STICKY_COL_WIDTH = 64; // w-16 = 4rem = 64px
const BUFFER_TICKS = 20; // Extra ticks to render off-screen

// Memoized Cell Component for Performance
const CellItem = React.memo(({ cell, cellWidth, t, getColor, getLabel, getTextColor }: { 
  cell: TimelineCell, 
  cellWidth: number, 
  t: number,
  getColor: (c: TimelineCell) => string,
  getLabel: (c: TimelineCell) => string | number,
  getTextColor: (c: TimelineCell) => string
}) => (
  <div
    className={`absolute h-[24px] flex items-center justify-center text-[10px] font-bold rounded-[2px] ${getColor(cell)} ${getTextColor(cell)}`}
    style={{ 
      left: `${t * cellWidth}px`, 
      width: `${Math.max(0, cellWidth - 1)}px`,
      fontSize: cellWidth < 12 ? '0px' : '10px' 
    }}
    title={`T=${t}: ${cell.state} ${cell.info ?? ''}`}
  >
    {getLabel(cell)}
  </div>
));

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-3 h-3 ${color} rounded-sm`}></div>
    <span className="text-xs text-gray-600 font-medium">{label}</span>
  </div>
);

const Timeline: React.FC<Props> = ({ data, simDuration, scrollToTick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(20);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  
  // Ref to store where we want to be after a width change
  const zoomPivot = useRef<{ tick: number, offset: number } | null>(null);

  const nodeIds = useMemo(() => Object.keys(data).map(Number), [data]);

  // Initial measurements
  useLayoutEffect(() => {
    if (containerRef.current) {
      setViewportWidth(containerRef.current.clientWidth);
    }
    const handleResize = () => {
      if (containerRef.current) setViewportWidth(containerRef.current.clientWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll Sync for Log Clicks
  useEffect(() => {
    if (scrollToTick !== null && containerRef.current) {
      const targetX = scrollToTick * cellWidth;
      const containerW = containerRef.current.clientWidth;
      const newScroll = Math.max(0, targetX - (containerW / 2) + STICKY_COL_WIDTH);
      containerRef.current.scrollLeft = newScroll;
    }
  }, [scrollToTick, cellWidth]);

  // Restore scroll position after zoom (Layout Effect runs before paint)
  useLayoutEffect(() => {
    if (zoomPivot.current && containerRef.current) {
      const { tick, offset } = zoomPivot.current;
      // visualX = tick * width
      // scrollLeft = visualX - offset
      const newScroll = (tick * cellWidth) - offset;
      containerRef.current.scrollLeft = Math.max(0, newScroll);
      zoomPivot.current = null;
    }
  }, [cellWidth]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      
      if (!containerRef.current) return;

      const oldWidth = cellWidth;
      const newWidth = Math.max(2, Math.min(100, oldWidth - e.deltaY * 0.05));
      
      if (Math.abs(newWidth - oldWidth) < 0.1) return;

      const rect = containerRef.current.getBoundingClientRect();
      // Mouse X relative to the viewport of the container
      const mouseX = e.clientX - rect.left;
      
      // We need to find the "Tick" currently under the mouse.
      // Container Structure:
      // [Sticky 64px] (Overlays content)
      // Content inside starts at X=0, but visually aligned.
      // Actually, the sticky column covers the first 64px of the viewport.
      // The content inside the overflow div starts at 0.
      // So visuals:
      // Viewport 0..64 : Sticky Header
      // Viewport 64..W : Timeline Data
      
      // When scrolling, the 'scrollLeft' shifts the content left.
      // Visual X of a Tick T = (T * width) - scrollLeft + STICKY_COL_WIDTH
      
      // Let's invert to find T:
      // MouseX = (T * width) - scrollLeft + STICKY_COL_WIDTH
      // T * width = MouseX + scrollLeft - STICKY_COL_WIDTH
      // T = (MouseX + scrollLeft - STICKY_COL_WIDTH) / width
      
      const currentScroll = containerRef.current.scrollLeft;
      const mouseTick = (mouseX + currentScroll - STICKY_COL_WIDTH) / oldWidth;
      
      // Store the Pivot: We want 'mouseTick' to remain at 'mouseX' visually
      // offset = Visual X relative to start of timeline content (which is 64px from left)
      // Actually simpler: We just want to preserve the distance from the tick start to the mouse.
      // New Scroll Target:
      // MouseX = (mouseTick * newWidth) - NewScroll + STICKY_COL_WIDTH
      // NewScroll = (mouseTick * newWidth) - MouseX + STICKY_COL_WIDTH
      
      // Let's store the "Visual Offset from Left Edge" (MouseX - STICKY)
      const offsetFromSticky = mouseX - STICKY_COL_WIDTH;
      
      zoomPivot.current = { 
        tick: mouseTick, 
        offset: offsetFromSticky 
      };

      setCellWidth(newWidth);
    }
  };

  // Virtualization Calculations
  const visibleStart = Math.max(0, Math.floor((scrollLeft - STICKY_COL_WIDTH) / cellWidth) - BUFFER_TICKS);
  const visibleEnd = Math.min(simDuration, Math.ceil((scrollLeft + viewportWidth - STICKY_COL_WIDTH) / cellWidth) + BUFFER_TICKS);

  const getColor = (cell: TimelineCell) => {
    if (cell.isCollision) return 'bg-red-500';
    switch (cell.state) {
      case NodeType.IDLE: return 'bg-gray-100 opacity-0';
      case NodeType.SENSING: return 'bg-yellow-200';
      case NodeType.BACKOFF: return 'bg-yellow-400';
      case NodeType.BACKOFF_PAUSED: return 'bg-gray-300';
      case NodeType.TX_PREAMBLE: return 'bg-blue-500';
      case NodeType.TX_FC: return 'bg-emerald-500';
      case NodeType.TX_DATA: return 'bg-sky-400';
      case NodeType.WAIT_RIFS: return 'bg-purple-500';
      case NodeType.RX_ACK: return 'bg-indigo-500';
      case NodeType.COLLISION: return 'bg-red-500';
      case NodeType.FAILED: return 'bg-red-900';
      default: return 'bg-gray-200';
    }
  };

  const getTextColor = (cell: TimelineCell) => {
     if (cell.state === NodeType.BACKOFF || cell.state === NodeType.BACKOFF_PAUSED) return 'text-slate-800';
     return 'text-white';
  };

  const getLabel = (cell: TimelineCell) => {
    if (cell.state === NodeType.BACKOFF || cell.state === NodeType.BACKOFF_PAUSED) {
      return cell.info !== undefined ? cell.info : '';
    }
    switch (cell.state) {
      case NodeType.TX_PREAMBLE: return 'P';
      case NodeType.TX_FC: return 'F';
      case NodeType.TX_DATA: return '';
      case NodeType.WAIT_RIFS: return 'R';
      case NodeType.RX_ACK: return 'A';
      case NodeType.FAILED: return 'X';
      case NodeType.COLLISION: return '!';
      default: return '';
    }
  };

  const renderRuler = () => {
    const ticks = [];
    const snapStart = Math.floor(visibleStart / 20) * 20;
    
    for (let i = snapStart; i <= visibleEnd; i += 20) {
      ticks.push(
        <div 
          key={i} 
          className="absolute top-0 border-l border-gray-300 text-[10px] text-gray-500 pl-1 select-none pointer-events-none"
          style={{ left: `${i * cellWidth}px` }}
        >
          {i}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 shrink-0 z-20 relative">
        <LegendItem color="bg-yellow-200" label="Sense" />
        <LegendItem color="bg-yellow-400" label="Backoff" />
        <LegendItem color="bg-gray-300" label="Paused" />
        <LegendItem color="bg-blue-500" label="Preamble" />
        <LegendItem color="bg-emerald-500" label="FC" />
        <LegendItem color="bg-sky-400" label="Data" />
        <LegendItem color="bg-purple-500" label="RIFS" />
        <LegendItem color="bg-indigo-500" label="ACK" />
        <LegendItem color="bg-red-500" label="Collision" />
        <LegendItem color="bg-red-900" label="Drop" />
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative timeline-scroll"
        onScroll={handleScroll}
        onWheel={handleWheel}
      >
        <div 
          style={{ 
            width: `${simDuration * cellWidth + STICKY_COL_WIDTH + 100}px`, 
            minWidth: '100%'
          }}
          className="relative pb-4"
        >
          
          {/* Time Ruler */}
          <div className="h-6 sticky top-0 bg-white z-20 border-b border-gray-200 shadow-sm flex">
             <div className="w-16 shrink-0 bg-white border-r border-gray-200"></div>
             <div className="relative flex-1 h-full">
                {renderRuler()}
             </div>
          </div>

          {/* Nodes */}
          <div className="relative">
            {nodeIds.map(nodeId => (
              <div key={nodeId} className="flex items-center h-8 border-b border-gray-100 hover:bg-gray-50">
                
                <div className="sticky left-0 z-10 w-16 h-full flex items-center justify-center bg-slate-100 border-r border-gray-200 font-bold text-xs text-slate-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] shrink-0">
                  N{nodeId}
                </div>

                <div className="relative h-full flex-1">
                  {data[nodeId].slice(visibleStart, visibleEnd + 1).map((cell, idx) => {
                     const t = visibleStart + idx;
                     if (cell.state === NodeType.IDLE && cell.info === undefined) return null;
                     
                     return (
                       <CellItem 
                          key={t} 
                          cell={cell} 
                          cellWidth={cellWidth} 
                          t={t}
                          getColor={getColor}
                          getLabel={getLabel}
                          getTextColor={getTextColor}
                       />
                     );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      
      <div className="bg-gray-50 p-1 text-[10px] text-gray-400 text-center border-t border-gray-200 z-20 relative">
        Ctrl+Scroll to Zoom | Shift+Scroll to Pan
      </div>
    </div>
  );
};

export default Timeline;
