
import React from 'react';

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

const changelogData: ChangeLogEntry[] = [
    {
        version: '2.8.2',
        date: '21/11/2025',
        changes: [
            'Validazione CSV Avanzata: Il sistema ora controlla rigorosamente la correttezza delle date nel file importato. Errori comuni (es. anni a 5 cifre, typo come "202ò") vengono normalizzati automaticamente dove possibile.',
            'Report Errori Importazione: Se un post ha una data o un formato non recuperabile, non viene più importato con la data odierna. Al contrario, viene mostrata una lista rossa degli errori specificando la riga e il motivo, permettendo di correggere il file prima di procedere.',
        ]
    },
    {
        version: '2.8.1',
        date: '21/11/2025',
        changes: [
            'Importazione Intelligente: Il sistema ora riconosce automaticamente abbreviazioni e varianti dei canali durante l\'import CSV (es. IG, Insta -> Instagram; FB -> Facebook; Twitter -> X).',
            'Automazione Telegram: Importando post da CSV con canale "Telegram", il tipo di contenuto viene automaticamente impostato su "Aggiornamento", risparmiando tempo di categorizzazione manuale.'
        ]
    },
    {
        version: '2.8.0',
        date: '20/11/2025',
        changes: [
            'Ricerca Globale Storica: Il motore di ricerca è stato potenziato. Ora scansiona l\'intero archivio storico (inclusi anni passati come il 2023) e non solo i mesi visualizzati nel calendario.',
            'Modalità "Spotlight": Digitando nella barra, appare un menu rapido intelligente. Cliccando su un risultato, il calendario salta istantaneamente alla data di quel post, anche se è di 2 anni fa.',
            'Vista Risultati Dedicata: Premendo INVIO o "Vedi tutti", l\'interfaccia passa a una modalità "Risultati di Ricerca" esclusiva, elencando tutti i match trovati in ordine cronologico. Perfetto per trovare "tutti i post di Natale" degli ultimi 3 anni in un colpo solo.'
        ]
    },
    {
        version: '2.7.0',
        date: '18/11/2025',
        changes: [
            'Filtri Temporali Unificati: Uniformata la logica dei filtri rapidi (es. "Ultimo Mese") tra le sezioni Report e Follower. Ora entrambi calcolano i periodi basandosi sui mesi solari completi passati.',
            'Feedback Visivo Date: Quando si seleziona un filtro veloce (es. "Ultimi 3 Mesi"), i campi data "Dal" e "Al" si compilano automaticamente, mostrando chiaramente all\'utente l\'esatto intervallo temporale analizzato.',
            'Refactoring UI: Migliorata la barra dei controlli nella finestra Follower per renderla coerente con quella dei Report.'
        ]
    },
    {
        version: '2.6.0',
        date: '17/11/2025',
        changes: [
            'Curiosità & Record: Nuova sezione nei report che svela statistiche interessanti come i "Weekend Warriors" (post nel fine settimana), il giorno preferito per pubblicare e la streak (costanza) record.',
            'Filtro Netto Potenziato: Il menu di configurazione del KPI "Pubblicati (Netto)" ora rileva automaticamente tutti i canali presenti nei post, inclusi "Generico" o canali eliminati, permettendo un\'esclusione precisa al 100%.',
        ]
    },
    {
        version: '2.5.1',
        date: '16/11/2025',
        changes: [
            'Fix minori: Migliorata la stabilità dell\'esportazione CSV e risolti piccoli bug visivi.',
        ]
    },
    {
        version: '2.5.0',
        date: '15/11/2025',
        changes: [
            'Export Follower: Aggiunta la possibilità di esportare i dati dei follower in formato CSV (Excel).',
            'Stampa Report Follower: Nuova funzione "Stampa PDF" nel pannello follower per generare un report pulito con soli grafici e KPI, nascondendo i controlli di modifica.'
        ]
    },
    {
        version: '2.4.0',
        date: '15/11/2025',
        changes: [
            'Calcolatore Crescita Dinamico: Nel pannello Follower è ora presente una barra "Analisi Periodo". Puoi selezionare date precise (Dal... Al...) o usare i preset (1 Mese, 6 Mesi, 1 Anno).',
            'KPI Precisi: I box "Crescita (Valore)" e "Crescita (%)" non mostrano più dati fissi, ma calcolano esattamente la variazione nel periodo selezionato dall\'utente.',
            'Fix Statistiche: Risolto il problema per cui la crescita appariva come "0" quando i dati mancavano. Il sistema ora cerca automaticamente la rilevazione più vicina alle date scelte.'
        ]
    },
    {
        version: '2.3.1',
        date: '14/11/2025',
        changes: [
            'Dettaglio Aggiornamento: Nel box "Monitoraggio Canali Diretti" (WhatsApp/Telegram), ora viene mostrata la data esatta dell\'ultimo dato inserito. Questo aiuta a capire se il numero visualizzato è recente o fermo a una data passata.',
            'Anteprima CSV Intelligente: Migliorata la finestra di conferma importazione follower per mostrare un riepilogo più chiaro prima di salvare.'
        ]
    },
    {
        version: '2.3.0',
        date: '14/11/2025',
        changes: [
            'Analisi Follower Avanzata: Introdotta una barra dei filtri nella modale follower. Ora puoi analizzare l\'andamento di un singolo canale o confrontarne alcuni specifici (es. solo Instagram + TikTok) cliccando sui pulsanti in alto.',
            'Correzione Dati Mancanti (Fill-Forward): Se salti un inserimento per un mese, il sistema ora "ricorda" automaticamente l\'ultimo valore valido invece di segnare zero. Questo garantisce grafici di crescita sempre coerenti e realistici.',
            'Nuovi Grafici Strategici: Sostituiti i grafici generici con due visualizzazioni mirate: "Trend Totale" (numeri assoluti in crescita) e "Variazione Netta" (quanti follower reali guadagnati/persi mese su mese).'
        ]
    },
    {
        version: '2.2.3',
        date: '13/11/2025',
        changes: [
            'Layout Perfetto (Flexbox): Ridisegnata la struttura dell\'app. Ora il calendario e l\'agenda si adattano elasticamente all\'altezza dello schermo. Gli ultimi post in basso non vengono più tagliati, indipendentemente dalla dimensione del monitor.',
            'Fix Eliminazione Massiva: Risolto il problema del pulsante "Elimina" nella vista Agenda che a volte non rispondeva. Ora appare una finestra di conferma personalizzata sicura ed evidente.',
            'Stabilità Selezione: Migliorata la gestione della selezione multipla in Agenda per evitare deselezioni accidentali durante le operazioni.'
        ]
    },
    {
        version: '2.2.2',
        date: '12/11/2025',
        changes: [
            'Bug Fix Calendario: Risolto un problema fastidioso nella vista Mese. Cliccando su "+X Post" ora si apre SOLO la lista dei post giornalieri, senza attivare involontariamente la maschera di creazione di un nuovo post sotto.',
            'Copia Rapida: Aggiunto un comodo pulsante "Copia" accanto al titolo del post nella maschera di modifica. Basta un click per copiare il titolo negli appunti!'
        ]
    },
    {
        version: '2.2.1',
        date: '12/11/2025',
        changes: [
            'Super Agenda: Introdotto un selettore di data specifico per la vista Agenda. Ora puoi saltare istantaneamente a qualsiasi giorno specifico per iniziare la lista dei post da quella data.',
            'UX Toolbar: I controlli Mese/Anno vengono sostituiti dinamicamente dal selettore data preciso quando si passa alla vista Agenda.',
        ]
    },
    {
        version: '2.2.0',
        date: '12/11/2025',
        changes: [
            'Nuova Dashboard Report: Ridisegnata la sezione alta dei report. Ora i KPI più importanti (Totale, Pubblicati, Netto) sono sulla prima riga in evidenza.',
            'Nuovo KPI "Aggiornamenti": Aggiunta una scheda dedicata per contare specificamente i post su WhatsApp e Telegram.',
            'Grafico Trend Annuale: Aggiunto un istogramma in fondo ai report che mostra l\'andamento mensile dei post per tutto l\'anno selezionato, offrendo una visione d\'insieme immediata.'
        ]
    },
    {
        version: '2.1.2',
        date: '12/11/2025',
        changes: [
             'Fix UI Report: Risolto un bug visivo dove selezionando "Intero Anno" veniva erroneamente evidenziato anche il pulsante "Gennaio". Ora l\'evidenziazione è esclusiva.',
        ]
    },
    {
        version: '2.1.1',
        date: '12/11/2025',
        changes: [
             'Nuovo stato "Sponsorizzato": Aggiunta la possibilità di classificare i post come sponsorizzati (Ads/Paid) con colore distintivo (Rose).',
        ]
    },
    {
        version: '2.1.0',
        date: '11/11/2025',
        changes: [
            'Navigazione Rapida: Sostituita l\'etichetta statica del calendario con menu a tendina interattivi per Mese e Anno. Ora puoi saltare direttamente a qualsiasi data (es. Gennaio 2026) senza dover scorrere mese per mese.',
            'Report di Precisione: Eliminata la categoria generica "Altri" dai grafici. Ora vengono mostrati esplicitamente tutti gli stati (Non Iniziato, In Attesa, Cancellato) per una chiarezza analitica totale.',
            'UX Agenda Migliorata: La navigazione rapida funziona anche nella vista Agenda, permettendo di cambiare il periodo di visualizzazione istantaneamente.'
        ]
    },
    {
        version: '2.0.0',
        date: '10/11/2025',
        changes: [
            'Performance Estrema: Abilitata la cache offline (Persistence) per caricamenti istantanei e ridotto il peso iniziale dell\'app tramite Lazy Loading delle modali.',
            'Rifacimento Collaborazioni: Lo stato "Collaborazione" è ora uno stato ufficiale (non più un tipo). Questo permette di mantenere il tipo di contenuto reale (es. Reel o Video) pur marcando il post come collaborazione commerciale.',
            'Migrazione Dati Automatica: Implementato uno script di migrazione che all\'avvio converte i vecchi post "tipo collaborazione" nel nuovo formato stato senza perdita di informazioni.',
            'Filtri Report Avanzati: Introdotta una barra di ricerca real-time globale nei report, selettore rapido dell\'anno e pulsantiera per i 12 mesi per analisi ultra-veloci.',
            'Ottimizzazione Rendering: Sostituiti cicli di calcolo ridondanti con memoizzazione (useMemo) per una fluidità superiore durante lo scrolling del calendario.'
        ]
    },
    {
        version: '1.9.7',
        date: '09/11/2025',
        changes: [
            'Nuovo stato "Cancellato": Aggiunta la possibilità di marcare i post come cancellati (colore grigio scuro).',
            'Ordinamento Stati: I menu a tendina e la legenda ora mostrano gli stati in rigoroso ordine alfabetico.',
            'Vista Mese Arricchita: Nel calendario mensile, oltre al totale dei post del giorno, viene mostrato anche quanti sono stati Pubblicati (es. "5 Post (2 Pub)").'
        ]
    },
    {
        version: '1.9.6',
        date: '09/11/2025',
        changes: [
            'Nuova Importazione CSV: Ora puoi caricare post massivamente da file Excel/CSV. I post vengono aggiunti al calendario senza cancellare quelli esistenti.',
            'Fix Stampa Report: Risolto il problema della pagina bianca. La stampa ora genera un layout pulito e ottimizzato.',
            'Miglioramento Duplicazione: Quando duplichi un post, ora mantiene lo stato originale (es. Pubblicato) invece di tornare in Bozze.',
            'Fix Contatori Mese: I numeri "X Post" nella vista mensile ora rispettano correttamente i filtri attivi (Canali e Ricerca).'
        ]
    },
    {
        version: '1.9.5',
        date: '08/11/2025',
        changes: [
            'Migliorata Vista Mese: Cliccando su "+ Altri" si apre ora una finestra dedicata con la lista completa dei post del giorno in stile Agenda (invece di cambiare vista).',
            'KPI Avanzati: Aggiunto indicatore "Post Pubblicati (Netto)" nei report, che esclude automaticamente WhatsApp, Telegram e le Collaborazioni dal conteggio totale.',
            'Refactoring UX: Migliorata la leggibilità delle lise popup.'
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
