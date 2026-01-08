import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SocialChannel, FollowerStat } from '../types';
import { addFollowerStat, subscribeToFollowerStats, deleteFollowerStat } from '../services/firestoreService';
import { parseFollowersCsv } from '../utils/fileHandlers';
import moment from 'moment';

interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    channels: SocialChannel[];
}

const EXCLUDED_CHANNELS: string[] = ['WhatsApp', 'Telegram'];

// --- CUSTOM SVG CHARTS ---

const FollowersLineChart: React.FC<{ data: { date: string, total: number }[], color?: string }> = ({ data, color = "#3b82f6" }) => {
    if (data.length < 2) return <div className="text-gray-400 text-sm text-center py-10">Inserisci almeno due rilevazioni per vedere il trend.</div>;

    const width = 800;
    const height = 250;
    const padding = 40;

    const maxVal = Math.max(...data.map(d => d.total));
    const minVal = Math.min(...data.map(d => d.total));
    const range = maxVal - minVal || 1; 
    const buffer = range * 0.1;
    const effectiveMin = Math.max(0, minVal - buffer);
    const effectiveMax = maxVal + buffer;
    const effectiveRange = effectiveMax - effectiveMin;

    const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d.total - effectiveMin) / effectiveRange) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e5e7eb" strokeWidth="1" />
                <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                        <stop offset="100%" stopColor={color} stopOpacity="0"/>
                    </linearGradient>
                </defs>
                <polygon points={`${padding},${height-padding} ${points} ${width-padding},${height-padding}`} fill={`url(#gradient-${color})`} />
                {data.map((d, i) => {
                    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
                    const y = height - padding - ((d.total - effectiveMin) / effectiveRange) * (height - 2 * padding);
                    return (
                        <g key={i} className="group cursor-pointer">
                            <circle cx={x} cy={y} r="5" fill="#fff" stroke={color} strokeWidth="2" />
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <rect x={x - 30} y={y - 35} width="60" height="20" rx="4" fill="#1f2937" />
                                <text x={x} y={y - 21} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">
                                    {d.total.toLocaleString()}
                                </text>
                            </g>
                            <text x={x} y={height - 15} textAnchor="middle" fontSize="10" fill="#9ca3af" className="uppercase font-mono">
                                {moment(d.date).format('MMM YY')}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const NetGrowthBarChart: React.FC<{ data: { date: string, total: number }[] }> = ({ data }) => {
    const growthData = data.map((curr, i) => {
        if (i === 0) return { date: curr.date, diff: 0 };
        const prev = data[i-1];
        const diff = curr.total - prev.total;
        return { date: curr.date, diff: diff };
    }).slice(1);

    if (growthData.length === 0) return <div className="text-gray-400 text-sm text-center py-10">Dati insufficienti per il calcolo incrementi.</div>;

    const width = 800;
    const height = 200;
    const padding = 40;
    const maxAbs = Math.max(...growthData.map(d => Math.abs(d.diff)), 1); 
    const zeroY = height / 2; 

    return (
        <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <line x1={padding} y1={zeroY} x2={width-padding} y2={zeroY} stroke="#9ca3af" strokeWidth="1" />
                {growthData.map((d, i) => {
                    const barWidth = ((width - 2 * padding) / growthData.length) * 0.5;
                    const x = padding + (i * ((width - 2 * padding) / growthData.length)) + ((width - 2 * padding) / growthData.length / 2) - (barWidth/2);
                    const barH = (Math.abs(d.diff) / maxAbs) * (height / 2 - padding);
                    const y = d.diff >= 0 ? zeroY - barH : zeroY;
                    const color = d.diff >= 0 ? '#10b981' : '#ef4444';
                    return (
                        <g key={i} className="group">
                            <rect x={x} y={y} width={barWidth} height={barH} fill={color} rx="2" />
                            <text x={x + barWidth/2} y={d.diff >= 0 ? y - 5 : y + barH + 12} textAnchor="middle" fontSize="10" className="font-bold fill-gray-700 dark:fill-gray-300">
                                {d.diff > 0 ? '+' : ''}{d.diff.toLocaleString()}
                            </text>
                            <text x={x + barWidth/2} y={height - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">
                                {moment(d.date).format('MMM')}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};


const FollowersModal: React.FC<FollowersModalProps> = ({ isOpen, onClose, channels }) => {
    const [stats, setStats] = useState<FollowerStat[]>([]);
    const [entryDate, setEntryDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [inputValues, setInputValues] = useState<Record<string, number>>({});
    
    // FILTRI
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    
    // ANALISI TEMPORALE (Growth Calculator)
    const [analysisRange, setAnalysisRange] = useState<'1M' | '3M' | '6M' | '1A' | 'CUSTOM'>('1M');
    const [analysisStartDate, setAnalysisStartDate] = useState('');
    const [analysisEndDate, setAnalysisEndDate] = useState('');

    // IMPORT
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewData, setPreviewData] = useState<FollowerStat[] | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToFollowerStats((data) => {
            setStats(data);
        });
        return () => unsubscribe();
    }, [isOpen]);

    useEffect(() => {
        const existingEntry = stats.find(s => s.date === entryDate);
        if (existingEntry) {
            setInputValues(existingEntry.channels);
        } else {
            setInputValues({});
        }
    }, [entryDate, stats]);

    // UPDATE DATE INPUTS BASED ON PRESET SELECTION
    useEffect(() => {
        if (analysisRange === 'CUSTOM') return;

        // End Date is always end of LAST month
        const end = moment().subtract(1, 'months').endOf('month');
        let start = moment();

        switch (analysisRange) {
            case '1M': // Ultimo mese completo
                start = moment().subtract(1, 'months').startOf('month');
                break;
            case '3M': // Ultimi 3 mesi completi
                start = moment().subtract(3, 'months').startOf('month');
                break;
            case '6M': // Ultimi 6 mesi completi
                start = moment().subtract(6, 'months').startOf('month');
                break;
            case '1A': // Ultimi 12 mesi completi
                start = moment().subtract(12, 'months').startOf('month');
                break;
            default:
                start = moment().subtract(1, 'months').startOf('month');
        }

        setAnalysisStartDate(start.format('YYYY-MM-DD'));
        setAnalysisEndDate(end.format('YYYY-MM-DD'));
        
    }, [analysisRange]); // Trigger only when range changes

    // INITIAL LOAD DEFAULT
    useEffect(() => {
        if(stats.length > 0 && !analysisStartDate) {
             setAnalysisRange('1M');
        }
    }, [stats]);


    const handleInputChange = (channelName: string, value: string) => {
        setInputValues(prev => ({
            ...prev,
            [channelName]: parseInt(value) || 0
        }));
    };

    const toggleFilter = (channelName: string) => {
        setActiveFilters(prev => {
            if (prev.includes(channelName)) {
                return prev.filter(c => c !== channelName);
            } else {
                return [...prev, channelName];
            }
        });
    };

    const handleSave = async () => {
        const total = Object.entries(inputValues).reduce((acc, [name, count]) => {
            if (EXCLUDED_CHANNELS.includes(name)) return acc;
            return acc + (Number(count) || 0);
        }, 0);
        
        const newStat: FollowerStat = {
            date: entryDate,
            channels: inputValues,
            total: total
        };

        try {
            await addFollowerStat(newStat);
            alert("Dati salvati correttamente!");
        } catch (error) {
            console.error(error);
            alert("Errore nel salvataggio.");
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (window.confirm("Eliminare questa registrazione?")) {
            await deleteFollowerStat(id);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result;
            if (typeof content !== 'string') return;

            try {
                const importedStats = parseFollowersCsv(content);
                if (importedStats.length === 0) {
                    alert("Nessun dato valido trovato nel file. Verifica che le colonne siano: Canale, Data, Follower.");
                    return;
                }
                // Mostra anteprima invece di salvare subito
                setPreviewData(importedStats);
            } catch (err: any) {
                alert("Errore durante la lettura del file: " + err.message);
            } finally {
                if (event.target) event.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const confirmImport = async () => {
        if (!previewData) return;
        
        let successCount = 0;
        for (const stat of previewData) {
            try {
                await addFollowerStat(stat);
                successCount++;
            } catch (err) {
                console.error(`Errore importazione data ${stat.date}:`, err);
            }
        }
        alert(`Importazione completata! ${successCount} record aggregati/salvati.`);
        setPreviewData(null);
    };

    const cancelImport = () => {
        setPreviewData(null);
    };

    // --- PROCESSO DATI "INTELLIGENTE" (FILL-FORWARD) ---
    const processedData = useMemo(() => {
        const sortedStats = [...stats].sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
        
        const result: { date: string, total: number, channels: Record<string, number> }[] = [];
        let lastKnownValues: Record<string, number> = {};

        sortedStats.forEach(stat => {
            lastKnownValues = { ...lastKnownValues, ...stat.channels };

            let channelsToSum: string[] = [];
            if (activeFilters.length > 0) {
                channelsToSum = activeFilters;
            } else {
                channelsToSum = channels
                    .map(c => c.name)
                    .filter(name => !EXCLUDED_CHANNELS.includes(name));
            }

            let computedTotal = 0;
            channelsToSum.forEach(ch => {
                const val = lastKnownValues[ch];
                const num = Number(val);
                computedTotal += (isNaN(num) ? 0 : num);
            });

            result.push({
                date: stat.date,
                total: computedTotal,
                channels: { ...lastKnownValues }
            });
        });

        // FILTRO FINALE SUL PERIODO (Usando le date impostate dagli input)
        if (analysisStartDate && analysisEndDate) {
            const start = moment(analysisStartDate).startOf('day');
            const end = moment(analysisEndDate).endOf('day');
            return result.filter(d => moment(d.date).isBetween(start, end, undefined, '[]'));
        }

        return result;
    }, [stats, activeFilters, channels, analysisStartDate, analysisEndDate]);

    const latestData = processedData.length > 0 
        ? processedData[processedData.length - 1] 
        : { total: 0, channels: {} as Record<string, number>, date: '' };
    
    // DEFINIZIONE PREVDATA
    const prevData = processedData.length > 1 
        ? processedData[processedData.length - 2] 
        : { total: 0, channels: {} as Record<string, number>, date: '' };

    // Per il calcolo della crescita, prendiamo il primo e l'ultimo dato del periodo filtrato
    const periodGrowthStats = useMemo(() => {
        if (processedData.length < 2) return { diff: 0, percent: 0, startVal: 0, endVal: 0 };

        const startRecord = processedData[0];
        const endRecord = processedData[processedData.length - 1];

        const startVal = startRecord.total;
        const endVal = endRecord.total;
        const diff = endVal - startVal;
        const percent = startVal > 0 ? (diff / startVal) * 100 : 0;

        return { diff, percent, startVal, endVal };
    }, [processedData]);


    // --- CALCOLO DATE ULTIMO AGGIORNAMENTO PER CANALI ESCLUSI ---
    const lastUpdateDates = useMemo(() => {
        const dates: Record<string, string> = {};
        const sortedRawStats = [...stats].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());

        EXCLUDED_CHANNELS.forEach((ch: string) => {
            const hit = sortedRawStats.find(s => s.channels && s.channels[ch] !== undefined);
            dates[ch] = hit ? moment(hit.date).format('DD/MM/YY') : '-';
        });
        return dates;
    }, [stats]);
    
    // Calcolo totale record (non solo date, ma datapoints) per anteprima
    const previewTotalRecords = useMemo(() => {
        if (!previewData) return 0;
        return previewData.reduce((acc, stat) => acc + Object.keys(stat.channels).length, 0);
    }, [previewData]);

    // --- FUNZIONI DI EXPORT ---
    
    const handleExportCSV = () => {
        if (processedData.length === 0) {
            alert("Nessun dato disponibile per l'esportazione.");
            return;
        }

        // Determina quali colonne esportare (Data, Totale, e i singoli canali rilevati)
        const allChannels: string[] = Array.from(new Set(processedData.flatMap(d => Object.keys(d.channels)))).sort() as string[];
        
        const headers = ['Data', 'Totale', ...allChannels];
        
        const rows = processedData.map(row => {
            return [
                moment(row.date).format('DD/MM/YYYY'),
                row.total,
                ...allChannels.map((ch: string) => (row.channels as Record<string, number>)[ch] || '')
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `report_follower_${moment().format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        const content = document.getElementById('followers-analytics-panel');
        if (!content) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Report Follower</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            body { background-color: white !important; font-family: sans-serif; padding: 20px; }
                            .no-print { display: none !important; }
                        </style>
                    </head>
                    <body>
                        <div class="mb-6 border-b pb-4">
                            <h1 class="text-3xl font-bold">Report Analitico Follower</h1>
                            <p class="text-gray-600">Generato il ${moment().format('DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <div id="print-body">
                            ${content.innerHTML}
                        </div>
                        <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 500); }
                        </script>
                    </body>
                </html>
            `);
            doc.close();
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-[80] p-4">
            <div className="bg-gray-50 dark:bg-gray-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] relative">
                
                {/* Header */}
                <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            🚀 Crescita Follower
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Analisi trend e inserimento dati</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportCSV} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-800 transition-colors hidden sm:block">
                            Esporta CSV
                        </button>
                        <button onClick={handlePrint} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-800 transition-colors hidden sm:block">
                            Stampa PDF
                        </button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        
                        {/* LEFT COLUMN: DATA ENTRY */}
                        <div className="xl:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-gray-750 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    📝 Nuova Rilevazione
                                </h3>
                                
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                    <input 
                                        type="date" 
                                        value={entryDate} 
                                        onChange={(e) => setEntryDate(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {channels.map(channel => {
                                        const isExcluded = EXCLUDED_CHANNELS.includes(channel.name);
                                        return (
                                            <div key={channel.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }}></div>
                                                    <span className={`text-sm font-medium ${isExcluded ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                                        {channel.name}
                                                    </span>
                                                </div>
                                                <input 
                                                    type="number" 
                                                    placeholder="0"
                                                    value={inputValues[String(channel.name)] || ''}
                                                    onChange={(e) => handleInputChange(String(channel.name), e.target.value)}
                                                    className="w-24 p-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                    <button 
                                        onClick={handleSave}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                        Salva Dati
                                    </button>
                                    
                                    {/* Import Button */}
                                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    <button 
                                        onClick={handleImportClick}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Importa CSV
                                    </button>
                                </div>
                            </div>

                            {/* History Mini Table */}
                            <div className="bg-white dark:bg-gray-750 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm">Storico Inserimenti</h3>
                                <div className="overflow-x-auto max-h-[300px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="sticky top-0 bg-white dark:bg-gray-750">
                                            <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                <th className="pb-2">Data</th>
                                                <th className="pb-2 text-right">Totale (Reale)</th>
                                                <th className="pb-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.slice(0, 10).map(stat => (
                                                <tr key={stat.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="py-2 text-gray-600 dark:text-gray-300">{moment(stat.date).format('DD/MM/YY')}</td>
                                                    <td className="py-2 text-right font-mono font-medium">{stat.total.toLocaleString()}</td>
                                                    <td className="py-2 text-right">
                                                        <button onClick={() => handleDelete(stat.id)} className="text-red-400 hover:text-red-600 px-2" title="Elimina">×</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ANALYTICS (ID for printing) */}
                        <div id="followers-analytics-panel" className="xl:col-span-3 space-y-6">
                            
                            {/* TOP CONTROLS: FILTER CHANNEL & DATE RANGE */}
                            <div className="flex flex-col gap-4 bg-white dark:bg-gray-750 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm no-print">
                                
                                {/* 1. CHANNEL FILTERS */}
                                <div className="flex flex-wrap gap-2 items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">Filtra Canali:</span>
                                    {channels.map(channel => {
                                        const isActive = activeFilters.includes(channel.name);
                                        return (
                                            <button
                                                key={channel.id}
                                                onClick={() => toggleFilter(channel.name)}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border flex items-center gap-2
                                                    ${isActive 
                                                        ? 'text-white shadow-md scale-105' 
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'}
                                                `}
                                                style={{ 
                                                    backgroundColor: isActive ? channel.color : undefined,
                                                    borderColor: isActive ? channel.color : undefined
                                                }}
                                            >
                                                {channel.name}
                                                {isActive && <span>✓</span>}
                                            </button>
                                        );
                                    })}
                                    {activeFilters.length > 0 && (
                                        <button 
                                            onClick={() => setActiveFilters([])} 
                                            className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                {/* 2. DATE RANGE ANALYZER */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-grow">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Periodo Predefinito:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {(['1M', '3M', '6M', '1A'] as const).map((range) => (
                                                <button
                                                    key={range}
                                                    onClick={() => setAnalysisRange(range)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${analysisRange === range ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                >
                                                    {range === '1M' ? 'Ultimo Mese' : range === '3M' ? '3 Mesi' : range === '6M' ? '6 Mesi' : '1 Anno'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dal</label>
                                            <input 
                                                type="date" 
                                                value={analysisStartDate}
                                                onChange={(e) => { setAnalysisStartDate(e.target.value); setAnalysisRange('CUSTOM'); }}
                                                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Al</label>
                                            <input 
                                                type="date" 
                                                value={analysisEndDate}
                                                onChange={(e) => { setAnalysisEndDate(e.target.value); setAnalysisRange('CUSTOM'); }}
                                                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* KPI CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border-l-4 border-blue-500 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-2 right-2 p-2 opacity-10 text-4xl text-blue-500">👥</div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        Totale Attuale
                                    </p>
                                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{latestData.total.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        Al {moment(latestData.date).format('DD/MM/YY')}
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border-l-4 border-green-500 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Crescita (Valore)</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className={`text-3xl font-extrabold ${periodGrowthStats.diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                            {periodGrowthStats.diff > 0 ? '+' : ''}{periodGrowthStats.diff.toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        Dal {moment(analysisStartDate).format('DD/MM/YY')} al {moment(analysisEndDate).format('DD/MM/YY')}
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Crescita (%)</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className={`text-3xl font-extrabold ${periodGrowthStats.percent >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                                            {periodGrowthStats.percent > 0 ? '+' : ''}{periodGrowthStats.percent.toFixed(2)}%
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        Variazione percentuale nel periodo
                                    </p>
                                </div>
                            </div>

                            {/* CHARTS */}
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 text-sm flex items-center gap-2">
                                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                        📈 Trend Follower Totali (Numeri Assoluti)
                                    </h3>
                                    <FollowersLineChart 
                                        data={processedData} 
                                        color={activeFilters.length === 1 && channels.find(c => c.name === activeFilters[0]) ? channels.find(c => c.name === activeFilters[0])?.color : undefined} 
                                    />
                                </div>

                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 text-sm flex items-center gap-2">
                                        <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                                        📊 Variazione Netta Mensile (Nuovi Follower)
                                    </h3>
                                    <NetGrowthBarChart data={processedData} />
                                </div>
                            </div>
                            
                            {activeFilters.length === 0 && (
                                <div className="bg-blue-50 dark:bg-gray-800/50 p-4 rounded-xl border border-blue-100 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-3">💬 Monitoraggio Canali Diretti (Extra Report)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {EXCLUDED_CHANNELS.map((ch: string) => {
                                            const currVal = (latestData.channels as Record<string, number>)[ch] || 0;
                                            const prevVal = (prevData.channels as Record<string, number>)[ch] || 0;
                                            const diff = currVal - prevVal;
                                            const lastDate = lastUpdateDates[ch];
                                            
                                            return (
                                                <div key={ch} className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-600 dark:text-gray-300">{ch}</span>
                                                        <span className="text-[10px] text-gray-400">Agg: {lastDate}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg text-gray-900 dark:text-white">{currVal.toLocaleString()}</div>
                                                        {diff !== 0 && (
                                                            <span className={`text-xs ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                {diff > 0 ? '+' : ''}{diff}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* PREVIEW MODAL OVERLAY */}
                {previewData && (
                    <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm z-[90] flex items-center justify-center p-6 rounded-2xl">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Riepilogo Importazione</h3>
                                    <p className="text-sm text-gray-500">Controlla i dati prima di confermare</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                    {previewData.length} date / {previewTotalRecords} valori rilevati
                                </span>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 text-gray-500 dark:text-gray-300">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Data</th>
                                            <th className="px-6 py-3 font-medium">Canali Trovati</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {previewData.map((stat, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">
                                                    {moment(stat.date).format('DD/MM/YYYY')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(stat.channels).map(([ch, count]) => (
                                                            <span key={ch} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{ch}</span>
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{count}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-end gap-3">
                                <button 
                                    onClick={cancelImport}
                                    className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button 
                                    onClick={confirmImport}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Conferma Importazione
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FollowersModal;