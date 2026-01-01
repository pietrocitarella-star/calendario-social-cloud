
import React, { useState, useEffect, useMemo } from 'react';
import { SocialChannel, FollowerStat } from '../types';
import { addFollowerStat, subscribeToFollowerStats, deleteFollowerStat } from '../services/firestoreService';
import moment from 'moment';

interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    channels: SocialChannel[];
}

const EXCLUDED_CHANNELS = ['WhatsApp', 'Telegram'];

// --- CUSTOM SVG CHARTS ---

const FollowersLineChart: React.FC<{ data: { date: string, total: number }[], color?: string }> = ({ data, color = "#3b82f6" }) => {
    if (data.length < 2) return <div className="text-gray-400 text-sm text-center py-10">Inserisci almeno due rilevazioni per vedere il trend.</div>;

    const width = 800;
    const height = 250;
    const padding = 40;

    const maxVal = Math.max(...data.map(d => d.total));
    const minVal = Math.min(...data.map(d => d.total));
    // Aggiungiamo un po' di margine al range per estetica
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
                {/* Grid Lines */}
                <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e5e7eb" strokeWidth="1" />

                {/* Line */}
                <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Area under line (Gradient) */}
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                        <stop offset="100%" stopColor={color} stopOpacity="0"/>
                    </linearGradient>
                </defs>
                <polygon points={`${padding},${height-padding} ${points} ${width-padding},${height-padding}`} fill={`url(#gradient-${color})`} />

                {/* Dots & Labels */}
                {data.map((d, i) => {
                    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
                    const y = height - padding - ((d.total - effectiveMin) / effectiveRange) * (height - 2 * padding);
                    return (
                        <g key={i} className="group cursor-pointer">
                            <circle cx={x} cy={y} r="5" fill="#fff" stroke={color} strokeWidth="2" />
                            {/* Hover Value */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <rect x={x - 30} y={y - 35} width="60" height="20" rx="4" fill="#1f2937" />
                                <text x={x} y={y - 21} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">
                                    {d.total.toLocaleString()}
                                </text>
                            </g>
                            {/* Axis Date */}
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
    // Calcoliamo la differenza netta rispetto al mese precedente
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

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToFollowerStats((data) => {
            setStats(data);
        });
        return () => unsubscribe();
    }, [isOpen]);

    // Fill inputs on date change
    useEffect(() => {
        const existingEntry = stats.find(s => s.date === entryDate);
        if (existingEntry) {
            setInputValues(existingEntry.channels);
        } else {
            // OPTIONAL: Pre-fill with last known values for better UX?
            // For now, keep it clean to avoid confusion on what is saved.
            setInputValues({});
        }
    }, [entryDate, stats]);

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
        // Calcolo totale "stupido" per il salvataggio nel DB (esclusi messaggistica per coerenza storica)
        // Ma la logica di visualizzazione intelligente la facciamo nel render.
        const total = Object.entries(inputValues).reduce((acc, [name, count]) => {
            if (EXCLUDED_CHANNELS.includes(name)) return acc;
            return acc + (count || 0);
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

    // --- PROCESSO DATI "INTELLIGENTE" (FILL-FORWARD) ---
    // 1. Ordina per data
    // 2. Itera e riempie i buchi dei canali mancanti con l'ultimo valore noto
    // 3. Filtra in base ai social selezionati
    const processedData = useMemo(() => {
        const sortedStats = [...stats].sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
        
        const result: { date: string, total: number, channels: Record<string, number> }[] = [];
        let lastKnownValues: Record<string, number> = {};

        sortedStats.forEach(stat => {
            // Aggiorna la memoria con i valori presenti in questo record
            lastKnownValues = { ...lastKnownValues, ...stat.channels };

            // Determina quali canali sommare
            let channelsToSum: string[] = [];
            
            if (activeFilters.length > 0) {
                // Se ci sono filtri, somma SOLO quelli (inclusi WA/TG se selezionati)
                channelsToSum = activeFilters;
            } else {
                // Se nessun filtro, somma tutto TRANNE WA/TG
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
                channels: { ...lastKnownValues } // Snapshot dello stato completo in quel momento
            });
        });

        return result;
    }, [stats, activeFilters, channels]);

    // KPI Calculation based on Processed Data (Last entry vs Previous entry)
    const latestData = processedData.length > 0 ? processedData[processedData.length - 1] : { total: 0 };
    const prevData = processedData.length > 1 ? processedData[processedData.length - 2] : { total: 0 };
    
    const currentTotal = latestData.total;
    const momDiff = currentTotal - prevData.total;
    const momGrowth = prevData.total > 0 ? (momDiff / prevData.total) * 100 : 0;

    // YTD Calculation (Start of current year vs Now)
    const currentYear = moment().year();
    const startOfYearData = processedData.find(d => moment(d.date).year() === currentYear);
    const ytdGrowth = startOfYearData && startOfYearData.total > 0 && currentTotal > 0
        ? ((currentTotal - startOfYearData.total) / startOfYearData.total) * 100 
        : 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-[80] p-4">
            <div className="bg-gray-50 dark:bg-gray-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
                
                {/* Header */}
                <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            🚀 Crescita Follower
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Analisi trend e inserimento dati</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        
                        {/* LEFT COLUMN: DATA ENTRY (1 Column on XL) */}
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
                                                    value={inputValues[channel.name] || ''}
                                                    onChange={(e) => handleInputChange(channel.name, e.target.value)}
                                                    className="w-24 p-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                    <button 
                                        onClick={handleSave}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                        Salva Dati
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

                        {/* RIGHT COLUMN: ANALYTICS & CHARTS (3 Columns on XL) */}
                        <div className="xl:col-span-3 space-y-6">
                            
                            {/* FILTER BAR */}
                            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-750 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
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
                                        Mostra Tutti (Reset)
                                    </button>
                                )}
                            </div>

                            {/* KPI CARDS (Dynamic based on filter) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border-l-4 border-blue-500 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-2 right-2 p-2 opacity-10 text-4xl text-blue-500">👥</div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        {activeFilters.length > 0 ? `Totale (${activeFilters.length} selezionati)` : 'Totale Community'}
                                    </p>
                                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{currentTotal.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        {activeFilters.length === 0 ? 'Esclusi WhatsApp & Telegram' : 'Somma dei canali filtrati'}
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border-l-4 border-green-500 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Crescita Mese (MoM)</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className={`text-3xl font-extrabold ${momDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                            {momDiff > 0 ? '+' : ''}{momDiff.toLocaleString()}
                                        </p>
                                        <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${momGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">Rispetto all'ultima rilevazione</p>
                                </div>
                                <div className="bg-white dark:bg-gray-750 p-6 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Crescita Anno (YTD)</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className={`text-3xl font-extrabold ${ytdGrowth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                                            {ytdGrowth > 0 ? '+' : ''}{ytdGrowth.toFixed(1)}%
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">Da inizio {currentYear}</p>
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
                            
                            {/* MESSAGING APPS MONITORING (Always visible separately if NOT filtered out explicitly, or if explicitly selected) */}
                            {activeFilters.length === 0 && (
                                <div className="bg-blue-50 dark:bg-gray-800/50 p-4 rounded-xl border border-blue-100 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-3">💬 Monitoraggio Canali Diretti (Extra Report)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {EXCLUDED_CHANNELS.map(ch => {
                                            // Get latest data specifically for this channel from processed data (snapshot)
                                            const currVal = latestData.channels ? (latestData.channels[ch] || 0) : 0;
                                            const prevVal = prevData.channels ? (prevData.channels[ch] || 0) : 0;
                                            const diff = currVal - prevVal;
                                            
                                            return (
                                                <div key={ch} className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm flex justify-between items-center">
                                                    <span className="font-medium text-gray-600 dark:text-gray-300">{ch}</span>
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
            </div>
        </div>
    );
};

export default FollowersModal;
