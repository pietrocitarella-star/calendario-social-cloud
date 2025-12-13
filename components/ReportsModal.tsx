
import React, { useMemo, useState } from 'react';
import { Post, SocialChannel, PostStatus, PostType, TeamMember } from '../types';
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
    'bg-amber-500'
];

// Mappa per convertire le classi Tailwind in Hex per gli SVG
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
};

const resolveColor = (color: string) => {
    if (color.startsWith('#')) return color;
    return TAILWIND_HEX_MAP[color] || '#9ca3af';
};

// ... (Componenti grafici KPI, Donut, Progress) ...
const KPICard: React.FC<{ title: string; value: number | string; colorClass?: string; icon?: React.ReactNode; subtext?: string }> = ({ title, value, colorClass = "text-gray-900 dark:text-white", icon, subtext }) => (
    <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-between transition-transform hover:scale-105 h-full">
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
    
    // NUOVO: Stato per l'anno di riferimento dei filtri mese/anno
    const [selectedYear, setSelectedYear] = useState(moment().year());

    const [chartPrefs, setChartPrefs] = useState({
        status: 'donut' as ChartType,
        channel: 'bar' as ChartType,
        type: 'bar' as ChartType,
        team: 'bar' as ChartType
    });
    
    // Genera i nomi dei mesi
    const months = moment.monthsShort();
    
    const handleYearChange = (delta: number) => {
        setSelectedYear(prev => prev + delta);
    };

    const handleMonthPreset = (monthIndex: number) => {
        // Usa selectedYear invece dell'anno corrente
        const start = moment().year(selectedYear).month(monthIndex).startOf('month').format('YYYY-MM-DD');
        const end = moment().year(selectedYear).month(monthIndex).endOf('month').format('YYYY-MM-DD');
        setCustomStartDate(start);
        setCustomEndDate(end);
        setTimeRange('CUSTOM');
    };

    const handleYearPreset = () => {
        // Usa selectedYear invece dell'anno corrente
        const start = moment().year(selectedYear).startOf('year').format('YYYY-MM-DD');
        const end = moment().year(selectedYear).endOf('year').format('YYYY-MM-DD');
        setCustomStartDate(start);
        setCustomEndDate(end);
        setTimeRange('CUSTOM');
    };

    const filteredPosts = useMemo(() => {
        let result = posts;
        const now = moment();

        // 1. Time Range Filter
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

        // 2. Search Filter
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
    }, [posts, timeRange, searchTerm, customStartDate, customEndDate, selectedYear]);

    const stats = useMemo(() => {
        const totalPosts = filteredPosts.length;
        const published = filteredPosts.filter(p => p.status === PostStatus.Published).length;
        const scheduled = filteredPosts.filter(p => p.status === PostStatus.Scheduled).length;
        const drafts = filteredPosts.filter(p => p.status === PostStatus.Draft).length;

        // --- NEW KPI LOGIC ---
        // Conta i post pubblicati ESCLUDENDO: Telegram, WhatsApp e Collaborazioni
        const netPublished = filteredPosts.filter(p => {
            if (p.status !== PostStatus.Published) return false;
            
            const isExcludedChannel = p.social === 'Telegram' || p.social === 'WhatsApp';
            const isExcludedType = p.postType === PostType.Collaboration; // 'collaborazione'
            
            return !isExcludedChannel && !isExcludedType;
        }).length;
        // ---------------------

        const postsByChannel = channels.map(channel => ({
            label: channel.name,
            value: filteredPosts.filter(p => p.social === channel.name).length,
            color: channel.color
        })).sort((a,b) => b.value - a.value).filter(item => item.value > 0);

        const typeCounts: Record<string, number> = {};
        filteredPosts.forEach(p => { typeCounts[p.postType] = (typeCounts[p.postType] || 0) + 1; });
        const postsByType = Object.entries(typeCounts)
            .map(([type, count], index) => ({
                label: type,
                value: count,
                color: TYPE_COLORS[index % TYPE_COLORS.length]
            })).sort((a, b) => b.value - a.value);

        const statusData = [
            { label: 'Pubblicati', value: published, color: 'bg-green-500' },
            { label: 'Programmati', value: scheduled, color: 'bg-blue-400' },
            { label: 'In Bozze', value: drafts, color: 'bg-yellow-400' },
            { label: 'Da Approvare', value: filteredPosts.filter(p => p.status === PostStatus.NeedsApproval).length, color: 'bg-orange-400' },
            { label: 'Altri', value: totalPosts - published - scheduled - drafts - filteredPosts.filter(p => p.status === PostStatus.NeedsApproval).length, color: 'bg-gray-400' },
        ].filter(d => d.value > 0);

        // --- TEAM STATS LOGIC ---
        // Filtriamo solo i post PUBBLICATI che hanno un assegnatario
        const teamPublishedCounts: Record<string, number> = {};
        filteredPosts.filter(p => p.status === PostStatus.Published && p.assignedTo).forEach(p => {
            if (p.assignedTo) {
                teamPublishedCounts[p.assignedTo] = (teamPublishedCounts[p.assignedTo] || 0) + 1;
            }
        });

        const teamStats = Object.entries(teamPublishedCounts).map(([id, count]) => {
             const member = teamMembers.find(m => m.id === id);
             return {
                 label: member ? member.name : 'Utente rimosso',
                 value: count,
                 color: member ? member.color : '#9ca3af'
             };
        }).sort((a,b) => b.value - a.value);

        return { totalPosts, published, scheduled, drafts, netPublished, postsByChannel, postsByType, statusData, teamStats };
    }, [filteredPosts, channels, teamMembers]);

    const handlePrint = () => window.print();

    const handleExportCSV = () => {
        // Logica migliorata per la stringa del periodo
        let dateRangeLabel = '';
        const now = moment();
        
        if (timeRange === 'CUSTOM' && customStartDate && customEndDate) {
            dateRangeLabel = `${moment(customStartDate).format('DD/MM/YYYY')} - ${moment(customEndDate).format('DD/MM/YYYY')}`;
        } else if (timeRange === 'YEAR') {
            dateRangeLabel = `01/01/${selectedYear} - 31/12/${selectedYear}`;
        } else if (timeRange === 'ALL') {
             dateRangeLabel = 'Tutto lo storico';
        } else {
             // Presets come 1M, 3M...
             const rangeMap: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1A': 12 };
             if (rangeMap[timeRange]) {
                 const start = now.clone().subtract(rangeMap[timeRange], 'months').format('DD/MM/YYYY');
                 const end = now.format('DD/MM/YYYY');
                 dateRangeLabel = `${start} - ${end} (${RANGE_LABELS[timeRange]})`;
             } else {
                 dateRangeLabel = RANGE_LABELS[timeRange];
             }
        }

        const rows = [
            ['REPORT ANALITICO CALENDARIO EDITORIALE'],
            ['Data Generazione', moment().format('DD/MM/YYYY HH:mm')],
            ['Periodo Analizzato', dateRangeLabel], // Usa la nuova label dettagliata
            ['Filtro Ricerca', searchTerm || 'Nessuno'],
            [],
            ['KPI GENERALI'],
            ['Totale Post', stats.totalPosts],
            ['Pubblicati (Totale)', stats.published],
            ['Pubblicati (Netto - No TG/WA/Collab)', stats.netPublished],
            ['Programmati', stats.scheduled],
            ['Bozze', stats.drafts],
            [],
            ['DISTRIBUZIONE PER CANALE'],
            ['Canale', 'Numero Post'],
            ...stats.postsByChannel.map(c => [c.label, c.value]),
            [],
            ['DISTRIBUZIONE PER TIPO CONTENUTO'],
            ['Tipo', 'Numero Post'],
            ...stats.postsByType.map(t => [t.label, t.value]),
            [],
            ['PERFORMANCE TEAM (Post Pubblicati)'],
            ['Membro', 'Post Pubblicati'],
            ...stats.teamStats.map(m => [m.label, m.value]),
            []
        ];

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
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
                    /* Imposta margini e dimensioni pagina */
                    @page { size: auto; margin: 5mm; }

                    /* Nascondi tutto il contenuto della pagina */
                    body {
                        visibility: hidden;
                        background-color: white;
                    }

                    /* Sovrascrivi overflow nascosto di body/root per permettere la stampa multipagina */
                    html, body, #root {
                        overflow: visible !important;
                        height: auto !important;
                    }

                    /* Rendi visibile e posiziona il contenitore del report */
                    #reports-root {
                        visibility: visible !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background-color: white;
                        z-index: 99999;
                    }

                    /* Assicura che tutti i figli del report siano visibili */
                    #reports-root * {
                        visibility: visible !important;
                    }

                    /* Reset degli stili della modale per adattarsi alla pagina A4 */
                    #reports-modal-content {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        max-height: none !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }

                    /* Nascondi elementi specifici non necessari in stampa */
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
            
            <div id="reports-root" className="w-full h-full flex items-center justify-center print:block print:w-full print:h-auto">
                <div id="reports-modal-content" className="bg-gray-50 dark:bg-gray-800 w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] print:bg-white print:max-h-none print:rounded-none">
                    
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-sm print:static print:border-none print:shadow-none">
                        <div className="flex justify-between items-center p-4">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white print:text-black">Report Analitico</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                    Analisi dettagliata performance
                                </p>
                            </div>
                            <div className="flex items-center gap-2 no-print">
                                <button onClick={handleExportCSV} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium border border-emerald-200">CSV</button>
                                <button onClick={handlePrint} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium border border-indigo-200">Stampa</button>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        </div>

                        {/* Filters Panel */}
                        <div className="px-4 pb-4 flex flex-col xl:flex-row gap-4 justify-between items-start bg-gray-50/50 dark:bg-gray-800/50 no-print border-t border-gray-100 dark:border-gray-700 pt-3">
                            
                            {/* Left: Quick Search */}
                            <div className="w-full xl:w-64">
                                <input
                                    type="text"
                                    placeholder="Cerca nei report..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            {/* Center: Month Grid & Date Picker */}
                            <div className="flex flex-col gap-2 w-full">
                                
                                {/* Selettore Anno per Filtri Rapidi */}
                                <div className="flex justify-center xl:justify-end items-center gap-3 mb-1">
                                    <button onClick={() => handleYearChange(-1)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white px-2">
                                        &lt;
                                    </button>
                                    <span className="font-bold text-gray-800 dark:text-white text-sm">{selectedYear}</span>
                                    <button onClick={() => handleYearChange(1)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white px-2">
                                        &gt;
                                    </button>
                                </div>

                                {/* Mesi Rapidi */}
                                <div className="flex flex-wrap gap-1 justify-center xl:justify-end">
                                    {months.map((m, idx) => (
                                        <button
                                            key={m}
                                            onClick={() => handleMonthPreset(idx)}
                                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded border transition-colors ${
                                                timeRange === 'CUSTOM' 
                                                && moment(customStartDate).year() === selectedYear
                                                && moment(customStartDate).month() === idx 
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={handleYearPreset}
                                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded border ml-1 ${
                                            timeRange === 'CUSTOM'
                                            && moment(customStartDate).year() === selectedYear
                                            && moment(customStartDate).format('MM-DD') === '01-01'
                                            ? 'bg-purple-600 text-white border-purple-600' 
                                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                        }`}
                                    >
                                        Tutto il {selectedYear}
                                    </button>
                                </div>

                                {/* Custom Date Range & Presets */}
                                <div className="flex flex-wrap items-center gap-2 justify-center xl:justify-end">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Periodo:</span>
                                    <input 
                                        type="date" 
                                        value={customStartDate} 
                                        onChange={(e) => { setCustomStartDate(e.target.value); setTimeRange('CUSTOM'); }}
                                        className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <span className="text-xs text-gray-400">-</span>
                                    <input 
                                        type="date" 
                                        value={customEndDate} 
                                        onChange={(e) => { setCustomEndDate(e.target.value); setTimeRange('CUSTOM'); }}
                                        className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    
                                    <div className="h-4 w-px bg-gray-300 mx-2"></div>
                                    
                                    {(['1M', '3M', '6M', '1A', 'ALL'] as TimeRange[]).map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-2 py-1 text-xs font-semibold rounded transition-all ${
                                                timeRange === range
                                                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                                                    : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-grow space-y-6 print:overflow-visible bg-gray-50 dark:bg-gray-900/50">
                        
                        <div className="flex items-center justify-between print:mb-4">
                             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Risultati: <span className="text-gray-900 dark:text-white font-bold">{filteredPosts.length}</span> post nel periodo <span className="text-gray-900 dark:text-white font-bold">{timeRange === 'CUSTOM' ? `${moment(customStartDate).format('DD/MM/YY')} - ${moment(customEndDate).format('DD/MM/YY')}` : RANGE_LABELS[timeRange]}</span>
                            </p>
                        </div>

                        {/* KPI Row 1: Generale */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
                            <KPICard title="Totale" value={stats.totalPosts} icon={<span className="text-2xl">📝</span>} />
                            <KPICard title="Pubblicati (Tutti)" value={stats.published} colorClass="text-green-600 dark:text-green-400" icon={<span className="text-2xl">✅</span>} />
                            <KPICard title="Programmati" value={stats.scheduled} colorClass="text-blue-600 dark:text-blue-400" icon={<span className="text-2xl">📅</span>} />
                            <KPICard title="Bozze" value={stats.drafts} colorClass="text-yellow-600 dark:text-yellow-400" icon={<span className="text-2xl">✏️</span>} />
                        </div>

                        {/* KPI Row 2: Specifiche e Nette */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                             <KPICard 
                                title="Post Pubblicati (Netto)" 
                                value={stats.netPublished} 
                                colorClass="text-violet-600 dark:text-violet-400" 
                                icon={<span className="text-2xl">🎯</span>}
                                subtext="Esclusi: Telegram, WhatsApp, Collaborazioni"
                            />
                            {/* Placeholder per bilanciare la griglia o per un futuro KPI */}
                            <div className="hidden md:block"></div> 
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 print:grid-cols-2 print:block">
                            
                            {/* Status Distribution */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col print:border-gray-300 print:mb-4 print:break-inside-avoid">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-white print:text-black">Stato Contenuti</h3>
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
                                    <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-white print:text-black">Top Canali</h3>
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
                                    <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-white print:text-black">Tipologia</h3>
                                    <ChartToggle current={chartPrefs.type} onChange={(t) => setChartPrefs(prev => ({...prev, type: t}))} />
                                </div>
                                <div className="flex-grow flex items-center justify-center min-h-[200px]">
                                    {chartPrefs.type === 'donut' 
                                        ? <DonutChart data={stats.postsByType} />
                                        : <ProgressBarChart data={stats.postsByType} />
                                    }
                                </div>
                            </div>

                             {/* Team Performance - NUOVO */}
                             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 print:border-gray-300 print:mb-4 print:break-inside-avoid">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-white print:text-black">Performance Team</h3>
                                    <ChartToggle current={chartPrefs.team} onChange={(t) => setChartPrefs(prev => ({...prev, team: t}))} />
                                </div>
                                <div className="flex-grow flex items-center justify-center min-h-[200px]">
                                    {stats.teamStats.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center">Nessun post pubblicato assegnato nel periodo.</p>
                                    ) : (
                                        chartPrefs.team === 'donut' 
                                            ? <DonutChart data={stats.teamStats} />
                                            : <ProgressBarChart data={stats.teamStats} />
                                    )}
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
