import React, { useState, useEffect, useMemo } from 'react';
import { InstitutionalCampaign, SocialChannel, TeamMember, Post } from '../types';
import { 
    subscribeToInstitutionalCampaigns, 
    addInstitutionalCampaign, 
    updateInstitutionalCampaign, 
    deleteInstitutionalCampaign 
} from '../services/firestoreService';
import { exportInstitutionalCampaignsToPdf } from '../utils/fileHandlers';
import moment from 'moment';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    channels?: SocialChannel[];
    teamMembers?: TeamMember[];
    allPosts?: Post[];
    postsUpdateTrigger?: number;
    onEditPost?: (post: Post, campaignId?: string) => void;
}

const InstitutionalCampaignsModal: React.FC<Props> = ({ 
    isOpen, 
    onClose,
    channels,
    teamMembers,
    allPosts,
    postsUpdateTrigger,
    onEditPost
}) => {
    const [campaigns, setCampaigns] = useState<InstitutionalCampaign[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(moment().year());
    const [annualGoals, setAnnualGoals] = useState<Record<number, number>>({});
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form state
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('');
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [customChannelsStr, setCustomChannelsStr] = useState('');
    const [landingPage, setLandingPage] = useState('');
    const [notes, setNotes] = useState('');

    const availableChannels = useMemo(() => {
        const base = (channels || []).map(c => c.name);
        const usedChannels = new Set<string>();
        campaigns.forEach(c => {
            if (c.channels) {
                c.channels.forEach(ch => usedChannels.add(ch));
            }
        });
        return Array.from(new Set([...base, 'Sito web', 'Altro', ...Array.from(usedChannels)]));
    }, [channels, campaigns]);

    useEffect(() => {
        if (!isOpen) return;
        const unsub = subscribeToInstitutionalCampaigns(setCampaigns);
        
        const savedGoals = localStorage.getItem('annualCampaignGoals');
        if (savedGoals) {
            try { setAnnualGoals(JSON.parse(savedGoals)); } catch (e) {}
        } else {
            setAnnualGoals({ 2026: 13 }); // Default requested by user
        }
        
        return () => unsub();
    }, [isOpen]);

    const saveGoal = (year: number, goal: number) => {
        const newGoals = { ...annualGoals, [year]: goal };
        setAnnualGoals(newGoals);
        localStorage.setItem('annualCampaignGoals', JSON.stringify(newGoals));
    };

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => moment(c.startDate).year() === selectedYear || moment(c.endDate).year() === selectedYear);
    }, [campaigns, selectedYear]);

    const handleSave = async () => {
        if (!title || !startDate || !endDate) {
            alert("Titolo, Data Inizio e Data Fine sono obbligatori.");
            return;
        }

        const customArr = customChannelsStr.split(',').map(s => s.trim()).filter(s => s);
        const finalChannels = Array.from(new Set([...selectedChannels, ...customArr]));

        const campaignData: Omit<InstitutionalCampaign, 'id'> = {
            title,
            startDate,
            endDate,
            description,
            type,
            channels: finalChannels,
            landingPage,
            notes
        };

        try {
            if (editingId) {
                await updateInstitutionalCampaign(editingId, campaignData);
            } else {
                await addInstitutionalCampaign(campaignData);
            }
            closeForm();
        } catch (e) {
            console.error(e);
        }
    };

    const editCampaign = (c: InstitutionalCampaign) => {
        setEditingId(c.id!);
        setTitle(c.title);
        setStartDate(c.startDate);
        setEndDate(c.endDate);
        setDescription(c.description);
        setType(c.type);
        
        const predefined = availableChannels;
        const selected = (c.channels || []).filter(ch => predefined.includes(ch));
        const custom = (c.channels || []).filter(ch => !predefined.includes(ch));
        
        setSelectedChannels(selected);
        setCustomChannelsStr(custom.join(', '));
        setLandingPage(c.landingPage || '');
        setNotes(c.notes);
        setIsFormOpen(true);
    };

    const duplicateCampaign = (c: InstitutionalCampaign) => {
        setEditingId(null);
        setTitle(`${c.title} (Copia)`);
        setStartDate(c.startDate);
        setEndDate(c.endDate);
        setDescription(c.description);
        setType(c.type);
        
        const predefined = availableChannels;
        const selected = (c.channels || []).filter(ch => predefined.includes(ch));
        const custom = (c.channels || []).filter(ch => !predefined.includes(ch));
        
        setSelectedChannels(selected);
        setCustomChannelsStr(custom.join(', '));
        setLandingPage(c.landingPage || '');
        setNotes(c.notes);
        setIsFormOpen(true);
    };

    const deleteCampaign = async (id: string) => {
        if (window.confirm("Sei sicuro di voler eliminare questa campagna?")) {
            await deleteInstitutionalCampaign(id);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setTitle('');
        setStartDate('');
        setEndDate('');
        setDescription('');
        setType('');
        setSelectedChannels([]);
        setCustomChannelsStr('');
        setLandingPage('');
        setNotes('');
    };

    const toggleChannel = (channel: string) => {
        setSelectedChannels(prev => 
            prev.includes(channel) 
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        );
    };

    const handleExportPdf = () => {
        exportInstitutionalCampaignsToPdf(filteredCampaigns, selectedYear);
    };

    if (!isOpen) return null;

    const currentGoal = annualGoals[selectedYear] || 0;
    const progress = currentGoal > 0 ? Math.min(100, (filteredCampaigns.length / currentGoal) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-[80] p-4">
            <div className="bg-gray-50 dark:bg-gray-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] relative">
                {/* Header */}
                <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            🏛️ Rendicontazione Campagne
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Gestione e monitoraggio campagne istituzionali</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportPdf} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-800 transition-colors">
                            Esporta PDF
                        </button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="w-full md:w-1/3 flex flex-col gap-6">
                        {/* Goal Card */}
                        <div className="bg-white dark:bg-gray-750 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 dark:text-white">Anno di Riferimento</h3>
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold"
                                >
                                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Obiettivo Annuale</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={currentGoal}
                                        onChange={(e) => saveGoal(selectedYear, Number(e.target.value))}
                                        className="w-20 p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-center font-bold"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">campagne</span>
                                </div>
                            </div>

                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
                                            {filteredCampaigns.length} realizzate
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                                            {progress.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                                    <div style={{ width: `${progress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Form Card */}
                        <div className="bg-white dark:bg-gray-750 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 dark:text-white">
                                    {isFormOpen ? (editingId ? 'Modifica Campagna' : 'Nuova Campagna') : 'Aggiungi Campagna'}
                                </h3>
                                {!isFormOpen && (
                                    <button 
                                        onClick={() => setIsFormOpen(true)}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold"
                                    >
                                        + Nuova
                                    </button>
                                )}
                            </div>

                            {isFormOpen && (
                                <div className="space-y-3 animate-fadeIn">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Titolo *</label>
                                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Inizio *</label>
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fine *</label>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipologia</label>
                                        <input type="text" placeholder="Es. Sensibilizzazione, Informativa..." value={type} onChange={e => setType(e.target.value)} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Canali Utilizzati</label>
                                        <div className="grid grid-cols-2 gap-2 mt-1 mb-2">
                                            {availableChannels.map(channel => (
                                                <label key={channel} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedChannels.includes(channel)}
                                                        onChange={() => toggleChannel(channel)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="truncate">{channel}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Altri canali (es. Stampa, TV, Radio - separati da virgola)" 
                                            value={customChannelsStr} 
                                            onChange={e => setCustomChannelsStr(e.target.value)} 
                                            className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Landing Page (Link)</label>
                                        <input type="url" placeholder="https://..." value={landingPage} onChange={e => setLandingPage(e.target.value)} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrizione</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Note Aggiuntive</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"></textarea>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700">
                                            Salva
                                        </button>
                                        <button onClick={closeForm} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-500">
                                            Annulla
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content: List */}
                    <div className="w-full md:w-2/3">
                        <div className="bg-white dark:bg-gray-750 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Elenco Campagne {selectedYear}</h3>
                            
                            {filteredCampaigns.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p>Nessuna campagna registrata per il {selectedYear}.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredCampaigns.map(c => (
                                        <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-lg text-gray-900 dark:text-white">{c.title}</h4>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => editCampaign(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Modifica">✏️</button>
                                                    <button onClick={() => duplicateCampaign(c)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="Duplica">📄</button>
                                                    <button onClick={() => deleteCampaign(c.id!)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Elimina">🗑️</button>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-xs text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold">Periodo:</span> 
                                                    {moment(c.startDate).format('DD/MM/YY')} - {moment(c.endDate).format('DD/MM/YY')}
                                                </div>
                                                {c.type && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold">Tipo:</span> {c.type}
                                                    </div>
                                                )}
                                            </div>

                                            {c.description && (
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">{c.description}</p>
                                            )}

                                            {c.landingPage && (
                                                <div className="mb-3">
                                                    <a href={c.landingPage} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                        {c.landingPage}
                                                    </a>
                                                </div>
                                            )}

                                            {c.channels && c.channels.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {c.channels.map((ch, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded-full border border-gray-200 dark:border-gray-600">
                                                            {ch}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstitutionalCampaignsModal;
