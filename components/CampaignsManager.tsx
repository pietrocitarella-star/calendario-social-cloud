
import React, { useState, useEffect, useMemo } from 'react';
import { Campaign, Post, SocialChannel, TeamMember, PostStatus, PostType } from '../types';
import { addCampaign, subscribeToCampaigns, deleteCampaign, syncCampaignPosts, fetchPostsByCampaign } from '../services/firestoreService';
import moment from 'moment';
import { STATUS_COLORS } from '../constants';

interface CampaignsManagerProps {
    isOpen: boolean;
    onClose: () => void;
    channels: SocialChannel[];
    teamMembers: TeamMember[];
    onEditPost: (post: Post, campaignId: string) => void;
    allPosts?: Post[]; // Used for counting posts in list view
    postsUpdateTrigger?: number; // Used to trigger refresh in details view
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const CampaignsManager: React.FC<CampaignsManagerProps> = ({ 
    isOpen, 
    onClose, 
    channels, 
    teamMembers, 
    onEditPost,
    allPosts = [],
    postsUpdateTrigger = 0
}) => {
    const [viewMode, setViewMode] = useState<'LIST' | 'DETAILS'>('LIST');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [campaignPosts, setCampaignPosts] = useState<Post[]>([]);
    
    // Form State per Nuova Campagna
    const [isCreating, setIsCreating] = useState(false);
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({ color: COLORS[0] });

    // Export Settings
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'TABLE' | 'CARDS' | 'BOTH'>('BOTH');

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToCampaigns((data) => {
            setCampaigns(data);
        });
        return () => unsubscribe();
    }, [isOpen]);

    // Carica i post quando si seleziona una campagna O quando cambia il trigger esterno (post salvato)
    useEffect(() => {
        if (selectedCampaign && viewMode === 'DETAILS') {
            loadCampaignPosts(selectedCampaign.id);
        }
    }, [selectedCampaign, viewMode, postsUpdateTrigger]);

    const loadCampaignPosts = async (campaignId: string) => {
        const posts = await fetchPostsByCampaign(campaignId); 
        setCampaignPosts(posts.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf()));
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.name || !newCampaign.startDate || !newCampaign.endDate) {
            alert("Compila tutti i campi obbligatori (Nome, Inizio, Fine).");
            return;
        }
        await addCampaign(newCampaign as Campaign);
        setIsCreating(false);
        setNewCampaign({ color: COLORS[0] });
    };

    const handleDuplicateCampaign = async (campaign: Campaign, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Vuoi duplicare la campagna "${campaign.name}"? Verrà creata una copia della struttura (senza i post).`)) {
            const { id, ...campaignData } = campaign;
            await addCampaign({
                ...campaignData,
                name: `${campaign.name} (Copia)`,
                createdAt: new Date().toISOString()
            });
        }
    };

    const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Sei sicuro? I post associati non verranno eliminati ma resteranno orfani.")) {
            await deleteCampaign(id);
            if (selectedCampaign?.id === id) setViewMode('LIST');
        }
    };

    const handleOpenCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setViewMode('DETAILS');
    };

    const handleSyncToCalendar = async () => {
        if (!selectedCampaign) return;
        const confirmMsg = "ATTENZIONE: Stai per rendere visibili nel calendario principale TUTTI i post di questa campagna.\n\nSei sicuro di voler procedere?";
        if (window.confirm(confirmMsg)) {
            await syncCampaignPosts(selectedCampaign.id, false); // false = not hidden
            await loadCampaignPosts(selectedCampaign.id); // Forza ricaricamento locale
            alert("Tutti i post della campagna sono ora visibili nel calendario editoriale.");
        }
    };

    const handleHideFromCalendar = async () => {
        if (!selectedCampaign) return;
        if (window.confirm("Vuoi nascondere TUTTI i post di questa campagna dal calendario principale?")) {
            await syncCampaignPosts(selectedCampaign.id, true); // true = hidden
            await loadCampaignPosts(selectedCampaign.id); // Forza ricaricamento locale
            alert("I post sono stati nascosti dal calendario.");
        }
    };

    const getPostCountForCampaign = (campaignId: string) => {
        return allPosts.filter(p => p.campaignId === campaignId).length;
    };

    // --- PDF EXPORT LOGIC ---
    const generatePDF = () => {
        if (!selectedCampaign) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;

        if (doc) {
            doc.open();
            
            // HEADERS & STYLES
            let htmlContent = `
                <html>
                <head>
                    <title>Piano Editoriale - ${selectedCampaign.name}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { background: white; font-family: sans-serif; -webkit-print-color-adjust: exact; padding: 20px; }
                        .page-break { page-break-before: always; }
                        .card-shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
            `;

            // COVER PAGE
            htmlContent += `
                <div class="h-screen flex flex-col justify-center items-center text-center border-4 border-double border-gray-200 p-10 mb-8">
                    <h1 class="text-5xl font-bold text-gray-800 mb-4">${selectedCampaign.name}</h1>
                    <p class="text-xl text-gray-500 uppercase tracking-widest mb-8">Piano Editoriale Social Media</p>
                    
                    <div class="grid grid-cols-2 gap-8 text-left max-w-2xl mx-auto bg-gray-50 p-8 rounded-xl w-full">
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase">Periodo</p>
                            <p class="text-lg font-semibold">${moment(selectedCampaign.startDate).format('DD MMM YYYY')} - ${moment(selectedCampaign.endDate).format('DD MMM YYYY')}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase">Totale Post</p>
                            <p class="text-lg font-semibold">${campaignPosts.length}</p>
                        </div>
                        ${selectedCampaign.objective ? `
                        <div class="col-span-2">
                            <p class="text-xs font-bold text-gray-400 uppercase">Obiettivo</p>
                            <p class="text-lg font-medium text-blue-600">${selectedCampaign.objective}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // TABLE VIEW
            if (exportFormat === 'TABLE' || exportFormat === 'BOTH') {
                if (exportFormat === 'BOTH') htmlContent += `<div class="page-break"></div>`;
                
                htmlContent += `
                    <h2 class="text-2xl font-bold mb-6 pb-2 border-b-2 border-gray-800">Calendario Sintetico</h2>
                    <table class="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-100 border-b-2 border-gray-300">
                                <th class="p-3">Data</th>
                                <th class="p-3">Canale</th>
                                <th class="p-3">Titolo</th>
                                <th class="p-3">Tipologia</th>
                                <th class="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                campaignPosts.forEach((post, idx) => {
                    const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    htmlContent += `
                        <tr class="${bgClass} border-b border-gray-200">
                            <td class="p-3 font-mono text-gray-600">${moment(post.date).format('DD/MM/YYYY HH:mm')}</td>
                            <td class="p-3 font-bold">${post.social}</td>
                            <td class="p-3">${post.title}</td>
                            <td class="p-3 capitalize">${post.postType}</td>
                            <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold bg-gray-200">${post.status}</span></td>
                        </tr>
                    `;
                });
                
                htmlContent += `</tbody></table>`;
            }

            // CARDS VIEW
            if (exportFormat === 'CARDS' || exportFormat === 'BOTH') {
                if (exportFormat === 'BOTH') htmlContent += `<div class="page-break"></div>`;
                
                htmlContent += `<h2 class="text-2xl font-bold mb-6 pb-2 border-b-2 border-gray-800">Dettaglio Contenuti</h2>`;
                htmlContent += `<div class="grid grid-cols-1 gap-6">`;
                
                campaignPosts.forEach(post => {
                    const channel = channels.find(c => c.name === post.social);
                    const color = channel ? channel.color : '#9ca3af';
                    
                    htmlContent += `
                        <div class="border border-gray-200 rounded-xl p-0 overflow-hidden card-shadow break-inside-avoid mb-6">
                            <div class="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-4 h-4 rounded-full" style="background-color: ${color}"></div>
                                    <span class="font-bold text-lg">${post.social}</span>
                                    <span class="text-gray-400">|</span>
                                    <span class="font-mono text-gray-600">${moment(post.date).format('dddd DD MMMM YYYY - HH:mm')}</span>
                                </div>
                                <span class="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs uppercase font-bold tracking-wider">${post.postType}</span>
                            </div>
                            <div class="p-6">
                                <h3 class="text-xl font-bold mb-4">${post.title}</h3>
                                
                                <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                                    <p class="text-xs font-bold text-gray-400 uppercase mb-1">Copy / Note</p>
                                    <div class="text-sm text-gray-700 whitespace-pre-wrap">${post.notes || 'Nessuna nota inserita.'}</div>
                                </div>

                                <div class="flex gap-4 text-xs">
                                    ${post.externalLink ? `<div class="bg-blue-50 text-blue-700 px-3 py-2 rounded">🔗 Link: ${post.externalLink}</div>` : ''}
                                    ${post.creativityLink ? `<div class="bg-purple-50 text-purple-700 px-3 py-2 rounded">🎨 Media: ${post.creativityLink}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                htmlContent += `</div>`;
            }

            htmlContent += `</body></html>`;
            
            doc.write(htmlContent);
            doc.close();
            
            setTimeout(() => {
                iframe.contentWindow?.print();
                setShowExportModal(false);
                // Clean up handled by user closing print dialog usually, but we can leave iframe hidden
            }, 1000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-[75] p-4">
            <div className="bg-gray-100 dark:bg-gray-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col h-[90vh]">
                
                {/* --- HEADER --- */}
                <div className="p-5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {viewMode === 'DETAILS' && (
                            <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {viewMode === 'LIST' ? '📣 Campagne di Comunicazione' : selectedCampaign?.name}
                            </h2>
                            {viewMode === 'DETAILS' && selectedCampaign && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                    <span>📅 {moment(selectedCampaign.startDate).format('DD MMM')} - {moment(selectedCampaign.endDate).format('DD MMM YYYY')}</span>
                                    {selectedCampaign.objective && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">🎯 {selectedCampaign.objective}</span>}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-grow overflow-hidden relative">
                    
                    {/* VIEW: LISTA CAMPAGNE */}
                    {viewMode === 'LIST' && (
                        <div className="h-full overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Create New Card */}
                                <div className="bg-white dark:bg-gray-750 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all min-h-[200px]" onClick={() => setIsCreating(true)}>
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <h3 className="font-bold text-gray-700 dark:text-gray-200">Nuova Campagna</h3>
                                    <p className="text-sm text-gray-500 mt-1">Crea un nuovo piano editoriale</p>
                                </div>

                                {/* Campaign Cards */}
                                {campaigns.map(campaign => {
                                    const postCount = getPostCountForCampaign(campaign.id);
                                    return (
                                        <div 
                                            key={campaign.id} 
                                            onClick={() => handleOpenCampaign(campaign)}
                                            className="bg-white dark:bg-gray-750 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: campaign.color }}></div>
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{campaign.name}</h3>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleDuplicateCampaign(campaign, e)} className="text-gray-400 hover:text-blue-500 p-1" title="Duplica Campagna">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                                    </button>
                                                    <button onClick={(e) => handleDeleteCampaign(campaign.id, e)} className="text-gray-400 hover:text-red-500 p-1" title="Elimina Campagna">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2 mb-4">
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    {moment(campaign.startDate).format('DD MMM')} - {moment(campaign.endDate).format('DD MMM YYYY')}
                                                </p>
                                                {campaign.objective && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 line-clamp-1">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        {campaign.objective}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                                    {postCount} Post
                                                </span>
                                                <span className="text-blue-600 text-sm font-medium flex items-center gap-1 group-hover:underline">
                                                    Apri Piano <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* CREATION FORM MODAL OVERLAY */}
                    {isCreating && (
                        <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 z-10 flex items-center justify-center p-4">
                            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
                                <h3 className="text-xl font-bold mb-4 dark:text-white">Crea Nuova Campagna</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nome Campagna</label>
                                        <input type="text" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newCampaign.name || ''} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} placeholder="Es. Lancio Estivo 2025" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Data Inizio</label>
                                            <input type="date" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newCampaign.startDate || ''} onChange={e => setNewCampaign({...newCampaign, startDate: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Data Fine</label>
                                            <input type="date" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newCampaign.endDate || ''} onChange={e => setNewCampaign({...newCampaign, endDate: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Obiettivo (Opzionale)</label>
                                        <input type="text" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newCampaign.objective || ''} onChange={e => setNewCampaign({...newCampaign, objective: e.target.value})} placeholder="Es. Brand Awareness, Lead Gen..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">Colore Etichetta</label>
                                        <div className="flex gap-2">
                                            {COLORS.map(c => (
                                                <button 
                                                    key={c} 
                                                    onClick={() => setNewCampaign({...newCampaign, color: c})}
                                                    className={`w-8 h-8 rounded-full border-2 ${newCampaign.color === c ? 'border-gray-600 dark:border-white scale-110' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => setIsCreating(false)} className="flex-1 py-2 bg-gray-200 rounded text-gray-800 font-medium">Annulla</button>
                                        <button onClick={handleCreateCampaign} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Crea</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: DETTAGLIO CAMPAGNA */}
                    {viewMode === 'DETAILS' && selectedCampaign && (
                        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900/50">
                            
                            {/* Toolbar Campagna */}
                            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4 flex-wrap">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onEditPost({ title: '', date: moment().format('YYYY-MM-DDTHH:mm'), social: channels[0]?.name || '', status: PostStatus.Draft, postType: PostType.Post }, selectedCampaign.id)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <span className="text-lg">+</span> Aggiungi Post
                                    </button>
                                    <button 
                                        onClick={() => setShowExportModal(true)}
                                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Esporta Piano
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{campaignPosts.length}</span> Post Totali
                                    </div>
                                    <div className="h-6 w-px bg-gray-300"></div>
                                    <button onClick={handleSyncToCalendar} className="text-sm text-green-600 font-medium hover:underline" title="Mostra tutti i post nel calendario principale">
                                        Mostra nel Calendario
                                    </button>
                                    <button onClick={handleHideFromCalendar} className="text-sm text-gray-400 hover:text-gray-600 font-medium hover:underline" title="Nascondi i post dal calendario principale">
                                        Nascondi
                                    </button>
                                </div>
                            </div>

                            {/* LISTA POST (TIMELINE) */}
                            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                                {campaignPosts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <div className="text-6xl mb-4 opacity-30">📅</div>
                                        <p>Nessun post in questa campagna.</p>
                                        <p className="text-sm">Inizia aggiungendone uno!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-4xl mx-auto">
                                        {campaignPosts.map((post, idx) => {
                                            const channel = channels.find(c => c.name === post.social);
                                            const isHidden = post.hiddenFromCalendar;
                                            
                                            // Date separator logic
                                            const showDateHeader = idx === 0 || moment(post.date).format('YYYY-MM-DD') !== moment(campaignPosts[idx-1].date).format('YYYY-MM-DD');

                                            return (
                                                <div key={post.id}>
                                                    {showDateHeader && (
                                                        <div className="flex items-center gap-4 my-6">
                                                            <div className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                                                {moment(post.date).format('dddd D MMMM')}
                                                            </div>
                                                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-grow"></div>
                                                        </div>
                                                    )}
                                                    
                                                    <div 
                                                        onClick={() => onEditPost(post, selectedCampaign.id)}
                                                        className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative group"
                                                    >
                                                        {isHidden && (
                                                            <div className="absolute top-2 right-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200" title="Nascosto dal calendario principale">
                                                                👻 Nascosto
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex flex-col md:flex-row gap-4">
                                                            {/* Time & Social */}
                                                            <div className="flex md:flex-col items-center md:items-start gap-3 md:w-32 flex-shrink-0">
                                                                <span className="font-mono font-bold text-gray-500">{moment(post.date).format('HH:mm')}</span>
                                                                <span 
                                                                    className="px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wide"
                                                                    style={{ backgroundColor: channel?.color || '#999' }}
                                                                >
                                                                    {post.social}
                                                                </span>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-grow min-w-0">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{post.title}</h4>
                                                                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[post.status]}`}></span>
                                                                </div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{post.notes || 'Nessuna nota...'}</p>
                                                            </div>

                                                            {/* Type Badge */}
                                                            <div className="flex items-center md:flex-col md:justify-center">
                                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] uppercase font-bold px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                                                    {post.postType}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EXPORT MODAL */}
                    {showExportModal && (
                        <div className="absolute inset-0 bg-gray-900/50 z-20 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm">
                                <h3 className="font-bold text-lg mb-4 dark:text-white">Opzioni Esportazione PDF</h3>
                                <p className="text-sm text-gray-500 mb-4">Scegli lo stile del documento:</p>
                                
                                <div className="space-y-3 mb-6">
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                                        <input type="radio" name="format" checked={exportFormat === 'TABLE'} onChange={() => setExportFormat('TABLE')} className="text-blue-600" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-sm dark:text-gray-200">Solo Tabella</span>
                                            <span className="block text-xs text-gray-500">Compatto, lista cronologica.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                                        <input type="radio" name="format" checked={exportFormat === 'CARDS'} onChange={() => setExportFormat('CARDS')} className="text-blue-600" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-sm dark:text-gray-200">Solo Schede Visuali</span>
                                            <span className="block text-xs text-gray-500">Dettagliato, ideale per creativi.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                                        <input type="radio" name="format" checked={exportFormat === 'BOTH'} onChange={() => setExportFormat('BOTH')} className="text-blue-600" />
                                        <div className="ml-3">
                                            <span className="block font-bold text-sm dark:text-gray-200">Entrambi (Consigliato)</span>
                                            <span className="block text-xs text-gray-500">Tabella riassuntiva + Schede.</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setShowExportModal(false)} className="flex-1 py-2 bg-gray-200 rounded text-gray-800 font-medium">Annulla</button>
                                    <button onClick={generatePDF} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Genera PDF</button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CampaignsManager;
