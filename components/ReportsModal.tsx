
import React, { useMemo, useState } from 'react';
import { Post, SocialChannel, PostStatus } from '../types';
import moment from 'moment';
import 'moment/locale/it';

moment.locale('it');

interface ReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    posts: Post[];
    channels: SocialChannel[];
}

type TimeRange = '1M' | '3M' | '6M' | '1A' | 'ALL';
type ChartType = 'donut' | 'bar';

const RANGE_LABELS: Record<TimeRange, string> = {
    '1M': 'Ultimo Mese',
    '3M': 'Ultimi 3 Mesi',
    '6M': 'Ultimi 6 Mesi',
    '1A': 'Ultimo Anno',
    'ALL': 'Tutto'
};

const TYPE_COLORS = [
    'bg-pink-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-lime-500',
    'bg-amber-500'
];

// Mappa per convertire le classi Tailwind in Hex per gli SVG
const TAILWIND_HEX_MAP: Record<string, string> = {
    // Type colors
    'bg-pink-500': '#ec4899',
    'bg-purple-500': '#a855f7',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-teal-500': '#14b8a6',
    'bg-emerald-500': '#10b981',
    'bg-lime-500': '#84cc16',
    'bg-amber-500': '#f59e0b',
    
    // Status colors
    'bg-green-500': '#22c55e',
    'bg-blue-400': '#60a5fa',
    'bg-yellow-400': '#facc15',
    'bg-orange-400': '#fb923c',
    'bg-gray-400': '#9ca3af',
    'bg-indigo-400': '#818cf8',
};

const resolveColor = (color: string) => {
    if (color.startsWith('#')) return color;
    return TAILWIND_HEX_MAP[color] || '#9ca3af'; // Fallback gray
};

// ---- Helper Components for Charts ----

// 1. KPI Card
const KPICard: React.FC<{ title: string; value: number | string; colorClass?: string; icon?: React.ReactNode }> = ({ title, value, colorClass = "text-gray-900 dark:text-white", icon }) => (
    <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-between transition-transform hover:scale-105">
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
        </div>
        {icon && <div className="opacity-80">{icon}</div>}
    </div>
);

// 2. Donut Chart for Status
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return <div className="text-center text-gray-400 py-10">Nessun dato nel periodo selezionato</div>;

    let cumulativePercent = 0;
    
    // SVG Calculations
    const size = 160;
    const strokeWidth = 25;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex flex-col items-center justify-center gap-6 w-full">
            <div className="relative w-40 h-40 flex-shrink-0">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    {data.map((item, index) => {
                        const percent = item.value / total;
                        const dashArray = `${percent * circumference} ${circumference}`;
                        const dashOffset = -cumulativePercent * circumference;
                        cumulativePercent += percent;
                        
                        // Risolvi il colore: se è hex usa quello, se è classe tailwind usa la mappa
                        const strokeColor = resolveColor(item.color);

                        return (
                            <circle
                                key={index}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="transparent"
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 dark:text-gray-200 pointer-events-none">
                    <span className="text-2xl font-bold">{total}</span>
                    <span className="text-xs">Post</span>
                </div>
            </div>
            <div className="space-y-2 w-full max-w-xs">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${!item.color.startsWith('#') ? item.color : ''}`} style={{ backgroundColor: item.color.startsWith('#') ? item.color : undefined }}></span>
                        <span className="text-gray-600 dark:text-gray-300 truncate flex-grow">{item.label}</span>
                        <span className="font-bold ml-auto text-gray-800 dark:text-white">{Math.round((item.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 3. Simple Line Chart for Trends
const TrendChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">Dati insufficienti</div>;
    const max = Math.max(...data.map(d => d.value), 1); 
    const height = 150;
    const width = 500;
    const padding = 20;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - (d.value / max) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-[300px]">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                         <line 
                            key={tick} 
                            x1={padding} 
                            y1={height - tick * (height - padding*2) - padding} 
                            x2={width - padding} 
                            y2={height - tick * (height - padding*2) - padding} 
                            stroke="currentColor" 
                            strokeOpacity="0.1" 
                            className="text-gray-500"
                        />
                    ))}
                    
                    <polyline 
                        points={points} 
                        fill="none" 
                        stroke="#3B82F6" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                    
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                        const y = height - (d.value / max) * (height - padding * 2) - padding;
                        return (
                            <circle key={i} cx={x} cy={y} r="4" className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-gray-800" strokeWidth="2" />
                        );
                    })}
                </svg>
                <div className="flex justify-between mt-2 px-2">
                    {data.map((d, i) => (
                        <span key={i} className="text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-top-left" style={{display: data.length > 10 && i % 2 !== 0 ? 'none' : 'block'}}>{d.label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 4. Progress Bar List Chart (Reusable for Channels and Types)
const ProgressBarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    if (data.length === 0) return <div className="text-center text-gray-400 py-10">Nessun dato</div>;
    return (
        <div className="space-y-4 mt-2 w-full">
            {data.map((item, index) => (
                <div key={`${item.label}-${index}`} className="group">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${!item.color.startsWith('#') ? item.color : ''}`} style={{ backgroundColor: item.color.startsWith('#') ? item.color : undefined }}></span>
                            <span className="capitalize">{item.label}</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 font-mono">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ease-out group-hover:opacity-90 ${!item.color.startsWith('#') ? item.color : ''}`}
                            style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color.startsWith('#') ? item.color : undefined }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Toggle Button Component
const ChartToggle: React.FC<{ current: ChartType; onChange: (type: ChartType) => void }> = ({ current, onChange }) => (
    <div className="flex bg-gray-100 dark:bg-gray-600 rounded-lg p-0.5 no-print">
        <button
            onClick={() => onChange('donut')}
            className={`p-1.5 rounded-md transition-all ${current === 'donut' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
            title="Grafico a Ciambella"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
        </button>
        <button
            onClick={() => onChange('bar')}
            className={`p-1.5 rounded-md transition-all ${current === 'bar' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
            title="Grafico a Barre"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
    </div>
);


const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, posts, channels }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('6M');
    const [searchTerm, setSearchTerm] = useState('');
    
    // State per le preferenze dei grafici
    const [chartPrefs, setChartPrefs] = useState({
        status: 'donut' as ChartType,
        channel: 'bar' as ChartType,
        type: 'bar' as ChartType
    });
    
    const filteredPosts = useMemo(() => {
        let result = posts;

        // 1. Time Range Filter
        if (timeRange !== 'ALL') {
            const now = moment();
            const rangeMap: Record<string, number> = {
                '1M': 1,
                '3M': 3,
                '6M': 6,
                '1A': 12
            };
            
            if (rangeMap[timeRange]) {
                 const cutoff = now.clone().subtract(rangeMap[timeRange], 'months');
                 result = result.filter(p => moment(p.date).isAfter(cutoff));
            }
        }

        // 2. Search Term Filter
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(p => 
                p.title.toLowerCase().includes(lowerTerm) ||
                p.social.toLowerCase().includes(lowerTerm) ||
                p.postType.toLowerCase().includes(lowerTerm) ||
                p.status.toLowerCase().includes(lowerTerm) ||
                (p.notes && p.notes.toLowerCase().includes(lowerTerm))
            );
        }

        return result;
    }, [posts, timeRange, searchTerm]);

    const stats = useMemo(() => {
        // KPI Data
        const totalPosts = filteredPosts.length;
        const published = filteredPosts.filter(p => p.status === PostStatus.Published).length;
        const scheduled = filteredPosts.filter(p => p.status === PostStatus.Scheduled).length;
        const drafts = filteredPosts.filter(p => p.status === PostStatus.Draft).length;

        // Channel Data
        const postsByChannel = channels.map(channel => ({
            label: channel.name,
            value: filteredPosts.filter(p => p.social === channel.name).length,
            color: channel.color
        })).sort((a,b) => b.value - a.value).filter(item => item.value > 0);

        // Type Data
        const typeCounts: Record<string, number> = {};
        filteredPosts.forEach(p => {
            typeCounts[p.postType] = (typeCounts[p.postType] || 0) + 1;
        });
        const postsByType = Object.entries(typeCounts)
            .map(([type, count], index) => ({
                label: type,
                value: count,
                color: TYPE_COLORS[index % TYPE_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);

        // Status Data
        const statusData = [
            { label: 'Pubblicati', value: published, color: 'bg-green-500' },
            { label: 'Programmati', value: scheduled, color: 'bg-blue-400' },
            { label: 'In Bozze', value: drafts, color: 'bg-yellow-400' },
            { label: 'Da Approvare', value: filteredPosts.filter(p => p.status === PostStatus.NeedsApproval).length, color: 'bg-orange-400' },
            { label: 'Altri', value: totalPosts - published - scheduled - drafts - filteredPosts.filter(p => p.status === PostStatus.NeedsApproval).length, color: 'bg-gray-400' },
        ].filter(d => d.value > 0);

        // Trend Data
        let trendPoints = 6;
        if (timeRange === '1M') trendPoints = 4;
        if (timeRange === '1A') trendPoints = 12;
        if (timeRange === 'ALL') trendPoints = 12;

        const trendData = [];
        
        if (timeRange === '1M') {
            // Weekly breakdown
            for (let i = 3; i >= 0; i--) {
                const startWeek = moment().subtract(i, 'weeks').startOf('week');
                const endWeek = moment().subtract(i, 'weeks').endOf('week');
                const count = filteredPosts.filter(p => moment(p.date).isBetween(startWeek, endWeek, undefined, '[]')).length;
                trendData.push({ label: `Set ${4-i}`, value: count });
            }
        } else {
            // Monthly breakdown
            const monthsToShow = timeRange === '3M' ? 3 : (timeRange === '6M' ? 6 : 12);
            for (let i = monthsToShow - 1; i >= 0; i--) {
                const m = moment().subtract(i, 'months');
                const monthKey = m.format('YYYY-MM');
                trendData.push({
                    label: m.format('MMM'),
                    value: filteredPosts.filter(p => p.date.startsWith(monthKey)).length
                });
            }
        }

        return { totalPosts, published, scheduled, drafts, postsByChannel, postsByType, statusData, trendData };
    }, [filteredPosts, channels, timeRange]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const rows = [];
        rows.push(['REPORT ANALITICO CALENDARIO EDITORIALE']);
        rows.push(['Data Generazione', moment().format('DD/MM/YYYY HH:mm')]);
        rows.push(['Periodo Analizzato', RANGE_LABELS[timeRange]]);
        rows.push(['Filtro Ricerca', searchTerm || 'Nessuno']);
        rows.push([]);
        
        rows.push(['KPI GENERALI']);
        rows.push(['Totale Post', stats.totalPosts]);
        rows.push(['Pubblicati', stats.published]);
        rows.push(['Programmati', stats.scheduled]);
        rows.push(['Bozze', stats.drafts]);
        rows.push([]);

        rows.push(['DISTRIBUZIONE PER CANALE']);
        rows.push(['Canale', 'Numero Post']);
        stats.postsByChannel.forEach(c => rows.push([c.label, c.value]));
        rows.push([]);

        rows.push(['DISTRIBUZIONE PER TIPO CONTENUTO']);
        rows.push(['Tipo', 'Numero Post']);
        stats.postsByType.forEach(t => rows.push([t.label, t.value]));
        rows.push([]);

        rows.push(['TREND TEMPORALE']);
        rows.push(['Periodo', 'Numero Post']);
        stats.trendData.forEach(t => rows.push([t.label, t.value]));

        const csvContent = "data:text/csv;charset=utf-8," 
            + rows.map(e => e.join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_social_${moment().format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static">
            <style>{`
                @media print {
                    body > *:not(#reports-root) { display: none !important; }
                    #reports-root { display: block !important; position: absolute; top: 0; left: 0; width: 100%; height: auto; }
                    #reports-modal-content { box-shadow: none !important; border: none !important; max-width: 100% !important; width: 100% !important; max-height: none !important; overflow: visible !important; }
                    .no-print { display: none !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>
            
            <div id="reports-root" className="w-full h-full flex items-center justify-center print:block print:w-full print:h-auto">
                <div id="reports-modal-content" className="bg-gray-50 dark:bg-gray-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] print:bg-white print:max-h-none print:rounded-none">
                    
                    {/* Sticky Header Section */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-sm print:static print:border-none print:shadow-none">
                        
                        {/* Top Bar: Title & Global Actions */}
                        <div className="flex justify-between items-center p-6 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white print:text-black">Report Analitico</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block print:block">
                                    Panoramica delle performance editoriali
                                </p>
                            </div>

                            <div className="flex items-center gap-2 no-print">
                                <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200" title="Esporta CSV">
                                    <span className="font-bold text-sm">CSV</span>
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200" title="Stampa PDF">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium hidden md:inline">Stampa</span>
                                </button>
                                <div className="h-8 border-l border-gray-300 dark:border-gray-600 mx-1"></div>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Control Bar: Filters & Search */}
                        <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 no-print">
                            {/* Search */}
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cerca nei report..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-shadow"
                                />
                            </div>

                            {/* Time Filters */}
                            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                                {(Object.keys(RANGE_LABELS) as TimeRange[]).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                                            timeRange === range
                                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-grow space-y-6 print:overflow-visible bg-gray-50 dark:bg-gray-900/50">
                        
                        <div className="flex items-center justify-between print:mb-4">
                             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Risultati: <span className="text-gray-900 dark:text-white font-bold">{filteredPosts.length}</span> post nel periodo <span className="text-gray-900 dark:text-white font-bold">{RANGE_LABELS[timeRange]}</span>
                            </p>
                        </div>

                        {/* KPI Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
                            <KPICard title="Totale" value={stats.totalPosts} icon={<span className="text-2xl">📝</span>} />
                            <KPICard title="Pubblicati" value={stats.published} colorClass="text-green-600 dark:text-green-400" icon={<span className="text-2xl">✅</span>} />
                            <KPICard title="Programmati" value={stats.scheduled} colorClass="text-blue-600 dark:text-blue-400" icon={<span className="text-2xl">📅</span>} />
                            <KPICard title="Bozze" value={stats.drafts} colorClass="text-yellow-600 dark:text-yellow-400" icon={<span className="text-2xl">✏️</span>} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-2 print:block">
                            
                            {/* Status Distribution */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col print:border-gray-300 print:mb-4 print:break-inside-avoid">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white print:text-black">Stato Contenuti</h3>
                                    <ChartToggle current={chartPrefs.status} onChange={(t) => setChartPrefs(prev => ({...prev, status: t}))} />
                                </div>
                                <div className="flex-grow flex items-center justify-center min-h-[200px]">
                                    {chartPrefs.status === 'donut' 
                                        ? <DonutChart data={stats.statusData} />
                                        : <ProgressBarChart data={stats.statusData} />
                                    }
                                </div>
                            </div>

                            {/* Channel Performance */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 print:border-gray-300 print:mb-4 print:break-inside-avoid">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white print:text-black">Top Canali</h3>
                                    <ChartToggle current={chartPrefs.channel} onChange={(t) => setChartPrefs(prev => ({...prev, channel: t}))} />
                                </div>
                                <div className="flex-grow flex items-center justify-center min-h-[200px]">
                                    {chartPrefs.channel === 'donut' 
                                        ? <DonutChart data={stats.postsByChannel} />
                                        : <ProgressBarChart data={stats.postsByChannel} />
                                    }
                                </div>
                            </div>

                            {/* Type Performance */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 print:border-gray-300 print:mb-4 print:break-inside-avoid">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white print:text-black">Tipologia Contenuti</h3>
                                    <ChartToggle current={chartPrefs.type} onChange={(t) => setChartPrefs(prev => ({...prev, type: t}))} />
                                </div>
                                <div className="flex-grow flex items-center justify-center min-h-[200px]">
                                    {chartPrefs.type === 'donut' 
                                        ? <DonutChart data={stats.postsByType} />
                                        : <ProgressBarChart data={stats.postsByType} />
                                    }
                                </div>
                            </div>

                            {/* Trend */}
                            <div className="col-span-1 lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 print:border-gray-300 print:mb-4 print:break-inside-avoid">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 print:text-black">Trend Temporale</h3>
                                <div className="h-48 flex items-end">
                                    <TrendChart data={stats.trendData} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsModal;
