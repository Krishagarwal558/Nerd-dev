import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidViewerProps {
  chart: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#111827',
        primaryColor: '#6366F1',
        primaryTextColor: '#F8FAFC',
        primaryBorderColor: '#818CF8',
        lineColor: '#38BDF8',
        secondaryColor: '#1E293B',
        tertiaryColor: '#0F172A',
      },
    });

    let isMounted = true;
    const renderDiagram = async () => {
      if (!chart.trim()) return;
      try {
        setError(null);
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Mermaid rendering issue:', err);
          setError('Visual diagram preview unavailable.');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <span>⚠️ Diagram schematic:</span>
        </div>
        <pre className="overflow-x-auto p-2 bg-slate-950/80 rounded">{chart}</pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center p-6 bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse text-xs text-slate-500">
        Rendering architectural diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="p-4 rounded-xl bg-slate-900/80 border border-indigo-950/50 shadow-inner overflow-x-auto flex justify-center [&>svg]:max-w-full [&>svg]:h-auto transition-all"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
