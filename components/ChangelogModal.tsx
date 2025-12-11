

import React from 'react';

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

const changelogData: ChangeLogEntry[] = [
    {
        version: '1.9.5',
        date: '08/11/2025',
        changes: [
            'Migliorata Vista Mese: Cliccando su "+ N altri" si apre ora una finestra dedicata con la lista completa dei post del giorno in stile Agenda (invece di cambiare vista).',
            'KPI Avanzati: Aggiunto indicatore "Post Pubblicati (Netto)" nei report, che esclude automaticamente WhatsApp, Telegram e le Collaborazioni dal conteggio totale.',
            'Refactoring UX: Migliorata la leggibilità delle liste popup.'
        ]
    },
    {
        version: '1.9.0',
        date: '07/11/2025',
        changes: [
            'Vista Agenda Dettagliata: La visualizzazione lista ora mostra Avatar assegnatario, Tipo di contenuto, Badge stato e Canale social.',
            'Report Flessibili: Aggiunto selettore anno manuale (< 2025 >) nella modale report.',
            'Filtri Report Avanzati: I pulsanti dei mesi e "Intero Anno" ora si aggiornano in base all\'anno selezionato manualmente.',
            'Pulizia Report: Rimosso il grafico trend temporale per focalizzare l\'attenzione sui KPI aggregati.'
        ]
    },
    {
        version: '1.8.5',
        date: '06/11/2025',
        changes: [
            'UX Mese/Settimana Rivoluzionata: Il link "+ Altri" è ora una barra/pulsante "Vedi tutti (+N)" ben visibile che occupa tutta la larghezza della cella.',
            'Report Chirurgici: Aggiunta griglia rapida dei mesi (Gen, Feb...) e selettore date preciso "Dal... Al...".',
            'Ottimizzazione Spazi: Ridotto ulteriormente l\'ingombro verticale degli eventi nel mese per mostrarne di più prima del raggruppamento.'
        ]
    },
    {
        version: '1.8.0',
        date: '05/11/2025',
        changes: [
            'Performance Boost: Ora il calendario carica solo i post necessari per il periodo visualizzato (+2 mesi buffer), rendendo l\'app velocissima anche con migliaia di post.',
            'Report On-Demand: I dati dei report ora vengono scaricati integralmente solo quando richiesto, alleggerendo l\'avvio dell\'app.',
            'Export Ottimizzato: L\'esportazione JSON/CSV scarica tutti i dati in background senza rallentare l\'interfaccia.'
        ]
    },
    {
        version: '1.7.6',
        date: '04/11/2025',
        changes: [
            'Fix Stabilità: Risolto bug che faceva sparire il link "+ Altri" cambiando vista.',
            'Vista Settimanale: Layout ottimizzato per colonne strette, con altezza bilanciata e testo che va a capo.'
        ]
    },
    {
        version: '1.7.5',
        date: '04/11/2025',
        changes: [
            'Fix Sovrapposizione: Nella vista Giorno/Settimana i post ora si affiancano automaticamente senza sovrapporsi ("no-overlap").',
            'Layout Spazioso: Aumentata notevolmente l\'altezza delle righe orarie per una migliore leggibilità.',
            'Fix Mese: Il link "+ Altri" ora è sempre visibile e in primo piano.',
            'Design Adattivo: Le card degli eventi cambiano stile in base alla vista (Compatte nel Mese, Dettagliate nel Giorno).'
        ]
    },
    {
        version: '1.7.4',
        date: '03/11/2025',
        changes: [
            'Fix Critico: Risolto problema del pulsante "+ altri" che non appariva nella vista mensile.',
            'Design: Card degli eventi ridisegnate per essere più leggibili e compatte.',
            'Visualizzazione: Badge social più evidenti e separazione gerarchica delle informazioni.'
        ]
    },
    {
        version: '1.7.3',
        date: '03/11/2025',
        changes: [
            'Visual Improvement: Le etichette dei canali social nelle card sono ora colorate (Badge) per un riconoscimento immediato.',
            'Fix: Risolto problema di visibilità del pulsante "+ altri" nella vista mensile.'
        ]
    },
    {
        version: '1.7.2',
        date: '02/11/2025',
        changes: [
            'Design Refresh: Nuovo stile "Minimal" per le card del calendario.',
            'Migliorata leggibilità: rimosso il colore di sfondo pieno dagli eventi.',
            'UX: Ordinamento alfabetico automatico dei Tipi di Contenuto.',
            'Vista Giorno/Settimana: aumentata l\'altezza delle righe orarie per una lettura più chiara.'
        ]
    },
    {
        version: '1.7.1',
        date: '02/11/2025',
        changes: [
            'Aggiunto tipo di contenuto "Collaborazione".',
            'Automazione Intelligente: selezionando YouTube, il tipo contenuto diventa automaticamente "Video".'
        ]
    },
    {
        version: '1.7.0',
        date: '01/11/2025',
        changes: [
            'Nuova funzionalità "Team": gestisci collaboratori e colleghi.',
            'Assegnazione Post: assegna task specifici ai membri del team.',
            'Visualizzazione Avatar: le iniziali del collaboratore appaiono sul post nel calendario.',
            'Miglioramento Privacy: aggiunto tag "noindex" per nascondere l\'app ai motori di ricerca.'
        ]
    },
    {
        version: '1.5.0',
        date: '30/10/2025',
        changes: [
            'Aggiunto editor Markdown per le note (Grassetto, Corsivo, Liste).',
            'Introdotta modalità "Scrivi" e "Anteprima" nel dettaglio post.',
            'Aggiunta validazione automatica per i link esterni.',
            'Migliorata l\'interfaccia di formattazione con toolbar dedicata.',
            'Risolto bug importazione JSON con nuova procedura sicura.'
        ]
    },
    {
        version: '1.4.0',
        date: '28/10/2025',
        changes: [
            'Nuova sezione Reportistica avanzata.',
            'Esportazione dati in CSV ed Excel.',
            'Stampa PDF dei report.',
            'Grafici interattivi (Barre e Ciambella) per canali e stati.',
            'Sistema di notifiche per scadenze e approvazioni.'
        ]
    },
    {
        version: '1.3.0',
        date: '25/10/2025',
        changes: [
            'Introdotta cronologia versioni dei singoli post.',
            'Funzionalità di ripristino versioni precedenti.',
            'Duplicazione rapida dei post.',
            'Ricerca testuale globale nel calendario.'
        ]
    },
    {
        version: '1.2.0',
        date: '20/10/2025',
        changes: [
            'Filtri rapidi per canale social nel calendario.',
            'Visualizzazione "Popup" per giorni con molti post.',
            'Migliorata UX per eliminazione post con conferma.',
            'Traduzione completa in Italiano.'
        ]
    },
    {
        version: '1.0.0',
        date: '15/10/2025',
        changes: [
            'Rilascio iniziale.',
            'Gestione calendario drag & drop.',
            'Gestione canali social personalizzabili.',
            'Export/Import JSON di base.'
        ]
    }
];

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const currentVersion = changelogData[0].version;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            Novità e Aggiornamenti
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">
                                v{currentVersion}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Cronologia delle modifiche dell'applicazione
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {changelogData.map((release, index) => (
                        <div key={release.version} className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-700 last:border-0 pb-2">
                            {/* Dot indicator */}
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${index === 0 ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    Versione {release.version}
                                    {index === 0 && <span className="text-[10px] uppercase font-bold text-white bg-blue-600 px-2 py-0.5 rounded">Current</span>}
                                </h3>
                                <span className="text-xs font-mono text-gray-400">{release.date}</span>
                            </div>
                            
                            <ul className="space-y-2">
                                {release.changes.map((change, i) => (
                                    <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></span>
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-lg transition-colors font-medium text-sm shadow-lg"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
