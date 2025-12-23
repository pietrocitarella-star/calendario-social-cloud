
import React, { useMemo, useState } from 'react';
import { Post, SocialChannel, PostStatus, PostType, TeamMember } from '../types';
import { STATUS_COLORS } from '../constants';
import moment from 'moment';
import 'moment/locale/it';

moment.locale('it');

interface ReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    posts: Post[];
    channels: SocialChannel[];
    teamMembers: TeamMember[];
}

type TimeRange = 'CUSTOM' | '1M' | '3M' | '6M' | '1A' | 'ALL' | 'YEAR';
type ChartType = 'donut' | 'bar';

const RANGE_LABELS: Record<string, string> = {
    '1M': 'Ultimo Mese',
    '3M': 'Ultimi 3 Mesi',
    '6M': 'Ultimi 6 Mesi',
    '1A': 'Ultimo Anno',
    'YEAR': 'Anno Selezionato',
    'ALL': 'Tutto',
    'CUSTOM': 'Personalizzato'
};

const TYPE_COLORS = [
    'bg-pink-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-lime-500',
    'bg-amber-500',
    'bg-fuchsia-500'
];

const TAILWIND_HEX_MAP: Record<string, string> = {
    'bg-pink-500': '#ec4899',
    'bg-purple-500': '#a855f7',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-teal-500': '#14b8a6',
    'bg-emerald-500': '#10b981',
    'bg-lime-500': '#84cc16',
    'bg-amber-500': '#f59e0b',
    'bg-green-500': '#22c55e',
    'bg-blue-400': '#60a5fa',
    'bg-yellow-400': '#facc15',
    'bg-orange-400': '#fb923c',
    'bg-gray-400': '#9ca3af',
    'bg-indigo-400': '#818cf8',
    'bg-red-500': '#ef4444',
    'bg-violet-600': '#7c3aed',
    'bg-fuchsia-500': '#d946ef',
    'bg-fuchsia-600': '#c026d3',
    'bg-slate-600': '#475569',
    'bg-rose-500': '#f43f5e', // Aggiunto HEX per bg-rose-500
};

const resolveColor = (color: string) => {
    if (color.startsWith('#')) return color;
    return TAILWIND_HEX_MAP[color] || '#9ca3af';
};

const KPICard: React.FC<{ 
    title: string; 
    value: number | string; 
    colorClass?: string; 
    icon?: React.ReactNode; 
    subtext?: string;
    className?: string; 
}> = ({ title, value, colorClass = "text-gray-900 dark:text-white", icon, subtext, className = "" }) => (
    <div className={`bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-between transition-transform hover:scale-105 h-full ${className}`}>
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
            {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
        </div>
        {icon && <div className="opacity-80 flex-shrink-0 ml-2">{icon}</div>}
    </div>
);

const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return <div className="text-center text-gray-400 py-10">Nessun dato nel periodo selezionato</div>;
    let cumulativePercent = 0;
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
                        const strokeColor = resolveColor(item.color);
                        return (
                            <circle key={index} cx={center} cy={center} r={radius} fill="transparent" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 dark:text-gray-200 pointer-events-none">
                    <span className="text-2xl font-bold">{total}</span>
                    <span className="text-xs">Post</span>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full max-w-md">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${!item.color.startsWith('#') ? item.color : ''}`} style={{ backgroundColor: item.color.startsWith('#') ? item.color : undefined }}></span>
                        <span className="text-gray-600 dark:text-gray-300 truncate flex-grow capitalize">{item.label}</span>
                        <span className="font-bold ml-auto text-gray-800 dark:text-white">{Math.round((item.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
                        <div className={`h-2.5 rounded-full transition-all duration-500 ease-out group-hover:opacity-90 ${!item.color.startsWith('#') ? item.color : ''}`} style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color.startsWith('#') ? item.color : undefined }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ChartToggle: React.FC<{ current: ChartType; onChange: (type: ChartType) => void }> = ({ current, onChange }) => (
    <div className="flex bg-gray-100 dark:bg-gray-600 rounded-lg p-0.5 no-print">
        <button onClick={() => onChange('donut')} className={`p-1.5 rounded-md transition-all ${current === 'donut' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
        </button>
        <button onClick={() => onChange('bar')} className={`p-1.5 rounded-md transition-all ${current === 'bar' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
    </div>
);

const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, posts, channels, teamMembers }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('6M');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState(moment().year());
    const [chartPrefs, setChartPrefs] = useState({ status: 'donut' as ChartType, channel: 'bar' as ChartType, type: 'bar' as ChartType, team: 'bar' as ChartType });
    const months = moment.monthsShort();
    
    const handleYearChange = (delta: number) => setSelectedYear(prev => prev + delta);
    const handleMonthPreset = (monthIndex: number) => {
        const start = moment().year(selectedYear).month(monthIndex).startOf('month').format('YYYY-MM-DD');
        const end = moment().year(selectedYear).month(monthIndex).endOf('month').format('YYYY-MM-DD');
        setCustomStartDate(start); setCustomEndDate(end); setTimeRange('CUSTOM');
    };
    const handleYearPreset = () => {
        const start = moment().year(selectedYear).startOf('year').format('YYYY-MM-DD');
        const end = moment().year(selectedYear).endOf('year').format('YYYY-MM-DD');
        setCustomStartDate(start); setCustomEndDate(end); setTimeRange('CUSTOM');
    };

    const filteredPosts = useMemo(() => {
        let result = posts;
        const now = moment();
        
        if (timeRange === 'CUSTOM') {
            if (customStartDate && customEndDate) {
                const start = moment(customStartDate).startOf('day'); 
                const end = moment(customEndDate).endOf('day');
                result = result.filter(p => moment(p.date).isBetween(start, end, undefined, '[]'));
            }
        } else if (timeRange === 'YEAR') {
            const start = moment().year(selectedYear).startOf('year'); 
            const end = moment().year(selectedYear).endOf('year');
            result = result.filter(p => moment(p.date).isBetween(start, end, undefined, '[]'));
        } else if (timeRange !== 'ALL') {
            const rangeMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1A': 12 };
            if (rangeMap[timeRange]) {
                 const cutoff = now.clone().subtract(rangeMap[timeRange], 'months');
                 result = result.filter(p => moment(p.date).isAfter(cutoff));
            }
        }

        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(p => {
                const member = teamMembers.find(m => m.id === p.assignedTo);
                return (
                    p.title.toLowerCase().includes(lowerTerm) || 
                    p.social.toLowerCase().includes(lowerTerm) || 
                    p.postType.toLowerCase().includes(lowerTerm) || 
                    p.status.toLowerCase().includes(lowerTerm) || 
                    (p.notes && p.notes.toLowerCase().includes(lowerTerm)) ||
                    (member && member.name.toLowerCase().includes(lowerTerm))
                );
            });
        }
        return result;
    }, [posts, timeRange, searchTerm, customStartDate, customEndDate, selectedYear, teamMembers]);

    const stats = useMemo(() => {
        const totalPosts = filteredPosts.length;
        const published = filteredPosts.filter(p => p.status === PostStatus.Published).length;
        const scheduled = filteredPosts.filter(p => p.status === PostStatus.Scheduled).length;
        const drafts = filteredPosts.filter(p => p.status === PostStatus.Draft).length;
        const collaborations = filteredPosts.filter(p => p.status === PostStatus.Collaboration).length;

        const netPublished = filteredPosts.filter(p => {
            if (p.status !== PostStatus.Published) return false;
            const isExcludedChannel = p.social === 'Telegram' || p.social === 'WhatsApp';
            return !isExcludedChannel;
        }).length;

        const postsByChannel = channels.map(channel => ({
            label: channel.name, value: filteredPosts.filter(p => p.social === channel.name).length, color: channel.color
        })).sort((a,b) => b.value - a.value).filter(item => item.value > 0);

        const typeCounts: Record<string, number> = {};
        filteredPosts.forEach(p => { typeCounts[p.postType] = (typeCounts[p.postType] || 0) + 1; });
        const postsByType = Object.entries(typeCounts).map(([type, count], index) => ({
            label: type, value: count, color: TYPE_COLORS[index % TYPE_COLORS.length]
        })).sort((a, b) => b.value - a.value);

        // MAPPA DINAMICA DI TUTTI GLI STATI
        const statusData = Object.values(PostStatus).map(status => {
            const count = filteredPosts.filter(p => p.status === status).length;
            return {
                label: status,
                value: count,
                color: STATUS_COLORS[status] || 'bg-gray-400'
            };
        })
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);

        const teamPublishedCounts: Record<string, number> = {};
        filteredPosts.filter(p => (p.status === PostStatus.Published || p.status === PostStatus.Collaboration) && p.assignedTo).forEach(p => {
            if (p.assignedTo) teamPublishedCounts[p.assignedTo] = (teamPublishedCounts[p.assignedTo] || 0) + 1;
        });
        const teamStats = Object.entries(teamPublishedCounts).map(([id, count]) => {
             const member = teamMembers.find(m => m.id === id);
             return { label: member ? member.name : 'Utente rimosso', value: count, color: member ? member.color : '#9ca3af' };
        }).sort((a,b) => b.value - a.value);

        return { totalPosts, published, scheduled, drafts, collaborations, netPublished, postsByChannel, postsByType, statusData, teamStats };
    }, [filteredPosts, channels, teamMembers]);

    const handlePrint = () => {
        const content = document.getElementById('reports-modal-content-body'); if (!content) return;
        const iframe = document.createElement('iframe'); iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
        document.body.appendChild(iframe); const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open(); doc.write(`
                <html><head><title>Report Analitico</title><script src="https://cdn.tailwindcss.com"></script><style>body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: sans-serif; padding: 20px; } .no-print { display: none !important; } h2, h3, p, span, div { color: black !important; }</style></head>
                <body><div class="mb-6 border-b pb-4"><h1 class="text-3xl font-bold">Report Analitico</h1><p class="text-gray-600">Generato il ${moment().format('DD/MM/YYYY HH:mm')}<br/>Periodo: ${timeRange === 'CUSTOM' ? `${moment(customStartDate).format('DD/MM/YY')} - ${moment(customEndDate).format('DD/MM/YY')}` : RANGE_LABELS[timeRange]}</p></div><div id="print-body">${content.innerHTML}</div><script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script></body></html>`);
            doc.close();
        }
    };

    const handleExportCSV = () => {
        const rows = [
            ['REPORT ANALITICO CALENDARIO EDITORIALE'], ['Data Generazione', moment().format('DD/MM/YYYY HH:mm')], ['KPI GENERALI'], ['Totale Post', stats.totalPosts], ['Pubblicati (Totale)', stats.published], ['Collaborazioni', stats.collaborations], ['Pubblicati (Netto)', stats.netPublished], [], ['DISTRIBUZIONE PER CANALE'], ...stats.postsByChannel.map(c => [c.label, c.value])
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `report_social_${moment().format('YYYY-MM-DD')}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="w-full h-full flex items-center justify-center">
                <div className="bg-gray-50 dark:bg-gray-800 w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-sm">
                        <div className="flex justify-between items-center p-4">
                            <div><h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Report Analitico</h2></div>
                            <div className="flex items-center gap-2 no-print">
                                <button onClick={handleExportCSV} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium border border-emerald-200">CSV</button>
                                <button onClick={handlePrint} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium border border-indigo-200">Stampa</button>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-grow space-y-6 bg-gray-50 dark:bg-gray-900/50">
                        {/* BARRA FILTRI E RICERCA */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4 no-print">
                            <div className="flex flex-col xl:flex-row gap-4">
                                {/* Ricerca Testuale */}
                                <div className="flex-grow">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cerca nel report</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Cerca per titolo, social, membro, note..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        />
                                        <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                </div>
                                
                                {/* Preset Temporali */}
                                <div className="xl:w-48">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Intervallo Predefinito</label>
                                    <select 
                                        value={timeRange} 
                                        onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Object.entries(RANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>

                                {/* Date Personalizzate */}
                                <div className="flex gap-2 xl:w-80">
                                    <div className="flex-grow">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dal</label>
                                        <input type="date" value={customStartDate} onChange={(e) => { setCustomStartDate(e.target.value); setTimeRange('CUSTOM'); }} className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs" />
                                    </div>
                                    <div className="flex-grow">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Al</label>
                                        <input type="date" value={customEndDate} onChange={(e) => { setCustomEndDate(e.target.value); setTimeRange('CUSTOM'); }} className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs" />
                                    </div>
                                </div>
                            </div>

                            {/* CONTROLLI RAPIDI ANNO E MESI */}
                            <div className="flex flex-col lg:flex-row gap-4 pt-2 border-t border-gray-50 dark:border-gray-700">
                                {/* Navigazione Anno */}
                                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg w-fit">
                                    <button onClick={() => handleYearChange(-1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors text-gray-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                                    <span className="font-bold text-gray-700 dark:text-gray-200 px-2">{selectedYear}</span>
                                    <button onClick={() => handleYearChange(1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors text-gray-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                                </div>

                                {/* Griglia Mesi */}
                                <div className="flex-grow flex flex-wrap gap-1.5">
                                    <button 
                                        onClick={handleYearPreset}
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${timeRange === 'CUSTOM' && moment(customStartDate).isSame(moment().year(selectedYear).startOf('year'), 'day') && moment(customEndDate).isSame(moment().year(selectedYear).endOf('year'), 'day') ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Intero Anno
                                    </button>
                                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1 hidden sm:block"></div>
                                    {months.map((m, i) => (
                                        <button
                                            key={m}
                                            onClick={() => handleMonthPreset(i)}
                                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${
                                                timeRange === 'CUSTOM' && 
                                                moment(customStartDate).month() === i && 
                                                moment(customEndDate).month() === i && // FIX: Controllo che anche la data fine sia nello stesso mese
                                                moment(customStartDate).year() === selectedYear 
                                                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400' 
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RISULTATI FILTRATI */}
                        <div id="reports-modal-content-body" className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KPICard title="Totale" value={stats.totalPosts} icon={<span className="text-2xl">📝</span>} />
                                <KPICard title="Pubblicati" value={stats.published} colorClass="text-green-600 dark:text-green-400" icon={<span className="text-2xl">✅</span>} />
                                <KPICard title="Collaborazioni" value={stats.collaborations} colorClass="text-fuchsia-600 dark:text-fuchsia-400" icon={<span className="text-2xl">🤝</span>} />
                                <KPICard title="Programmati" value={stats.scheduled} colorClass="text-blue-600 dark:text-blue-400" icon={<span className="text-2xl">📅</span>} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <KPICard 
                                    title="Post Pubblicati (Netto)" 
                                    value={stats.netPublished} 
                                    colorClass="text-violet-700 dark:text-violet-300 text-3xl" 
                                    className="ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/20 transform scale-105 z-10 shadow-lg border-transparent" 
                                    icon={<span className="text-3xl">🎯</span>} 
                                    subtext="Esclusi: TG, WA, Collaborazioni" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white text-sm">Stato</h3><ChartToggle current={chartPrefs.status} onChange={(t) => setChartPrefs(prev => ({...prev, status: t}))} /></div>
                                    <div className="flex-grow flex items-center justify-center min-h-[200px]">{chartPrefs.status === 'donut' ? <DonutChart data={stats.statusData} /> : <ProgressBarChart data={stats.statusData} />}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white text-sm">Canali</h3><ChartToggle current={chartPrefs.channel} onChange={(t) => setChartPrefs(prev => ({...prev, channel: t}))} /></div>
                                    <div className="flex-grow flex items-center justify-center min-h-[200px]">{chartPrefs.channel === 'donut' ? <DonutChart data={stats.postsByChannel} /> : <ProgressBarChart data={stats.postsByChannel} />}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white text-sm">Tipologia</h3><ChartToggle current={chartPrefs.type} onChange={(t) => setChartPrefs(prev => ({...prev, type: t}))} /></div>
                                    <div className="flex-grow flex items-center justify-center min-h-[200px]">{chartPrefs.type === 'donut' ? <DonutChart data={stats.postsByType} /> : <ProgressBarChart data={stats.postsByType} />}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white text-sm">Team</h3><ChartToggle current={chartPrefs.team} onChange={(t) => setChartPrefs(prev => ({...prev, team: t}))} /></div>
                                    <div className="flex-grow flex items-center justify-center min-h-[200px]">{chartPrefs.team === 'donut' ? <DonutChart data={stats.teamStats} /> : <ProgressBarChart data={stats.teamStats} />}</div>
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
