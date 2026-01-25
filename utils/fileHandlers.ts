
import { Post, PostStatus, PostType, TeamMember, FollowerStat } from '../types';
import moment from 'moment';

export interface ImportError {
    row: number;
    data: any;
    message: string;
}

export interface CsvParseResult {
    validPosts: Post[];
    errors: ImportError[];
}

const getFormattedDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
};

const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
};

export const exportPostsToJson = (posts: Post[]) => {
    const jsonString = JSON.stringify(posts, null, 2);
    const timestamp = getFormattedDate();
    downloadFile(jsonString, `calendario-editoriale_${timestamp}.json`, 'application/json');
};


const convertToCsv = (posts: Post[]): string => {
    if (posts.length === 0) return '';

    // Definiamo un ordine preferito per le colonne principali
    const preferredOrder = ['id', 'title', 'date', 'social', 'status', 'postType', 'notes', 'externalLink', 'creativityLink', 'assignedTo', 'history'];
    
    // Raccogliamo tutte le chiavi univoche da tutti i post per non perdere dati opzionali
    const allKeys = new Set<string>(preferredOrder);
    posts.forEach(post => Object.keys(post).forEach(key => allKeys.add(key)));
    
    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    const escapeCsvCell = (cell: any): string => {
        if (cell === null || cell === undefined) {
            return '';
        }
        
        let cellString: string;

        if (typeof cell === 'object') {
             // Serializza oggetti complessi (come history array) in JSON string per il CSV
             cellString = JSON.stringify(cell);
        } else {
             cellString = String(cell);
        }

        // Escape standard CSV (RFC 4180)
        if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
            return `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
    };

    for (const post of posts) {
        const values = headers.map(header => escapeCsvCell((post as any)[header]));
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

export const exportPostsToCsv = (posts: Post[]) => {
    const csvString = convertToCsv(posts);
    const timestamp = getFormattedDate();
    downloadFile(csvString, `calendario-editoriale_${timestamp}.csv`, 'text/csv;charset=utf-8;');
};

// --- CSV IMPORT LOGIC ---

// Mappa estesa per la normalizzazione dei nomi dei canali
const CHANNEL_NORMALIZATION_MAP: Record<string, string> = {
    // Facebook
    'fb': 'Facebook', 'facebook': 'Facebook', 'face': 'Facebook',
    // Instagram
    'ig': 'Instagram', 'insta': 'Instagram', 'instagram': 'Instagram',
    // LinkedIn
    'li': 'LinkedIn', 'linkedin': 'LinkedIn', 'linked': 'LinkedIn', 'ln': 'LinkedIn',
    // X / Twitter
    'x': 'X', 'twitter': 'X', 'tw': 'X', 'tweet': 'X',
    // YouTube
    'yt': 'YouTube', 'youtube': 'YouTube', 'tube': 'YouTube', 'yotube': 'YouTube',
    // WhatsApp
    'wa': 'WhatsApp', 'whatsapp': 'WhatsApp', 'wapp': 'WhatsApp', 'what': 'WhatsApp',
    // Telegram
    'tg': 'Telegram', 'telegram': 'Telegram', 'tele': 'Telegram',
    // TikTok
    'tk': 'TikTok', 'tiktok': 'TikTok', 'tik': 'TikTok',
    // Threads
    'th': 'Threads', 'threads': 'Threads',
    // Pinterest
    'pin': 'Pinterest', 'pinterest': 'Pinterest'
};

const cleanCsvString = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2026/g, "...")
        .trim();
};

const normalizeChannelName = (rawName: string): string => {
    if (!rawName) return 'Generico';
    
    // Pulisce la stringa, rimuove spazi e mette tutto in minuscolo per il confronto
    const normalizedKey = cleanCsvString(rawName).toLowerCase().replace(/\s/g, ''); 
    
    // 1. Controllo mappatura esatta
    if (CHANNEL_NORMALIZATION_MAP[normalizedKey]) {
        return CHANNEL_NORMALIZATION_MAP[normalizedKey];
    }

    // 2. Fallback intelligente: Capitalizza la prima lettera
    // Es. "pinterest" -> "Pinterest", "snapchat" -> "Snapchat"
    // Questo gestisce casi non mappati ma scritti "decentemente"
    const cleaned = cleanCsvString(rawName);
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const normalizeDateString = (rawDate: string): string => {
    if (!rawDate) return '';
    
    let cleaned = rawDate.trim().toLowerCase();

    // 1. Correzione Typos comuni tastiera italiana
    // 'ò', 'à', 'è' vengono spesso premuti al posto di numeri o simboli vicini
    cleaned = cleaned.replace(/ò/g, '0');
    cleaned = cleaned.replace(/à/g, '0');
    
    // 2. Normalizzazione Separatori
    // Sostituisce punti, trattini bassi o spazi anomali con slash o trattini standard
    cleaned = cleaned.replace(/[._]/g, '/');

    // 3. Correzione Anni "Lunghi" (es. 20255 -> 2025)
    // Cerca una sequenza di 5 cifre alla fine della stringa o seguita da spazio
    // Esempio: 12/12/20255 -> 12/12/2025
    cleaned = cleaned.replace(/\/(\d{4})\d\b/, '/$1');
    cleaned = cleaned.replace(/-(\d{4})\d\b/, '-$1');

    // 4. Correzione Anni "Corti" a inizio stringa (es. 20255-12-12)
    cleaned = cleaned.replace(/^(\d{4})\d-/, '$1-');

    return cleaned;
};

const CSV_MAPPING: Record<string, string> = {
    'titolo': 'title', 'title': 'title', 'oggetto': 'title', 'nome post': 'title',
    'data': 'date', 'date': 'date', 'giorno': 'date', 'day': 'date',
    'ora': 'timeStr', 'orario': 'timeStr', 'time': 'timeStr',
    'social': 'social', 'canale': 'social', 'channel': 'social', 'piattaforma': 'social', 'network': 'social',
    'stato': 'status', 'status': 'status', 'stato post': 'status',
    'tipo': 'postType', 'type': 'postType', 'post type': 'postType', 'tipologia': 'postType', 'formato': 'postType',
    'note': 'notes', 'notes': 'notes', 'copy': 'notes', 'testo': 'notes', 'descrizione': 'notes', 'caption': 'notes',
    'link': 'externalLink', 'externallink': 'externalLink', 'link esterno': 'externalLink', 'url': 'externalLink', 'link destinazione': 'externalLink', 'url post': 'externalLink', 'landing page': 'externalLink',
    'creatività': 'creativityLink', 'creativita': 'creativityLink', 'creativity': 'creativityLink', 'creativitylink': 'creativityLink', 'media': 'creativityLink', 'asset': 'creativityLink', 'grafica': 'creativityLink', 'link grafica': 'creativityLink', 'immagine': 'creativityLink', 'video': 'creativityLink',
    'assegnato a': 'assignedTo', 'assegnato': 'assignedTo', 'assignedto': 'assignedTo', 'assigned': 'assignedTo', 'owner': 'assignedTo', 'chi': 'assignedTo', 'responsabile': 'assignedTo'
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
    const values = [];
    let current = '';
    let inQuotes = false;
    const cleanedLine = line.replace(/[\u201C\u201D]/g, '"'); 

    for (let i = 0; i < cleanedLine.length; i++) {
        const char = cleanedLine[i];
        if (char === '"') {
            if (inQuotes && cleanedLine[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
};

export const parseCsvToPosts = (csvContent: string, teamMembers: TeamMember[] = []): CsvParseResult => {
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return { validPosts: [], errors: [] };

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = parseCsvLine(lines[0].toLowerCase(), delimiter).map(h => cleanCsvString(h).replace(/^"|"$/g, ''));
    
    const validPosts: Post[] = [];
    const errors: ImportError[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        if (values.length < 2) continue; // Skip empty rows

        const postData: any = {
            status: PostStatus.Draft,
            postType: PostType.Post,
            history: []
        };

        let rowHasData = false;

        headers.forEach((header, index) => {
            const mappedKey = CSV_MAPPING[header];
            if (mappedKey && values[index] !== undefined) {
                let value = values[index];
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                value = cleanCsvString(value);
                
                if (value) rowHasData = true;

                if (mappedKey === 'externalLink' || mappedKey === 'creativityLink') {
                    value = value.replace(/\s/g, ''); 
                }
                
                // Normalizzazione intelligente del Canale Social
                if (mappedKey === 'social') {
                    postData[mappedKey] = normalizeChannelName(value);
                } else {
                    postData[mappedKey] = value;
                }
            }
        });

        if (!rowHasData) continue; // Skip completely empty parsed rows

        // 1. REGOLE SPECIALI PER TELEGRAM
        if (postData.social === 'Telegram') {
            postData.postType = PostType.Update;
        }

        // 2. VALIDAZIONE E NORMALIZZAZIONE DATA
        let finalDate = moment();
        const dateFormats = ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'D/M/YYYY', 'D-M-YYYY', 'D/M/YY', 'DD/MM/YY'];
        const dateTimeFormats = ['YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD HH:mm', 'DD-MM-YYYY HH:mm', 'YYYY-MM-DD HH:mm:ss'];

        let dateString = postData.date ? normalizeDateString(postData.date) : '';
        let timeString = postData.timeStr ? postData.timeStr.replace('.', ':') : '';
        let parsedDate: moment.Moment | null = null;

        if (dateString) {
            if (timeString) {
                const combinedString = `${dateString} ${timeString}`;
                parsedDate = moment(combinedString, dateTimeFormats.concat(['DD/MM/YYYY H:mm', 'YYYY-MM-DD H:mm']), true);
            } 
            
            // Se fallisce con l'orario o non c'è orario, prova solo data
            if (!parsedDate || !parsedDate.isValid()) {
                parsedDate = moment(dateString, dateTimeFormats.concat(dateFormats), true);
                // Se abbiamo una data valida ma avevamo un orario che ha fallito, o non avevamo orario, impostiamo orario default se necessario
                // (Moment defaulta a 00:00 se non specificato, che va bene)
            }

            if (parsedDate.isValid()) {
                finalDate = parsedDate;
            } else {
                // ERRORE CRITICO DATA: Aggiungi agli errori e salta questo post
                errors.push({
                    row: i + 1, // Riga Excel (1-based + header)
                    data: postData,
                    message: `Data non valida o formato errato: "${postData.date}"`
                });
                continue; // Salta l'aggiunta ai validPosts
            }
        } else {
            // Se manca la data, usa oggi? No, meglio segnalare per i post importati
            // A meno che non si voglia default a "Oggi". 
            // La richiesta dice "nel caso si verifichino errori... presenta messaggio".
            // Una data mancante in un CSV è spesso un errore.
            errors.push({
                row: i + 1,
                data: postData,
                message: `Data mancante`
            });
            continue;
        }

        postData.date = finalDate.format('YYYY-MM-DDTHH:mm');
        delete postData.timeStr;

        if (postData.status) {
             const normalizedStatus = postData.status.toLowerCase();
             const matchedStatus = Object.values(PostStatus).find(s => s.toLowerCase() === normalizedStatus);
             if (matchedStatus) postData.status = matchedStatus;
        }

        // Se non è stato forzato da Telegram, prova a parsare il tipo
        if (!postData.postType || (postData.postType === PostType.Post && postData.social !== 'Telegram')) {
            if (postData.postType) { // Se c'era un valore stringa grezzo
                const normalizedType = postData.postType.toLowerCase();
                const matchedType = Object.values(PostType).find(t => t.toLowerCase() === normalizedType);
                if (matchedType) postData.postType = matchedType;
            }
        }

        if (postData.assignedTo && teamMembers.length > 0) {
            const rawAssignee = postData.assignedTo.toLowerCase();
            const matchedMember = teamMembers.find(m => 
                m.id === postData.assignedTo || 
                m.name.toLowerCase().trim() === rawAssignee.trim() ||
                m.name.toLowerCase().includes(rawAssignee.trim())
            );
            if (matchedMember) postData.assignedTo = matchedMember.id;
            else postData.assignedTo = undefined;
        }

        if (!postData.title) postData.title = '(Senza Titolo)';
        if (!postData.social) postData.social = 'Generico'; 

        validPosts.push(postData as Post);
    }
    
    return { validPosts, errors };
};

// --- FOLLOWER STATS IMPORT LOGIC ---

const EXCLUDED_FROM_TOTAL = ['WhatsApp', 'Telegram'];

export const parseFollowersCsv = (csvContent: string): FollowerStat[] => {
    // Rimuove BOM
    const cleanContent = csvContent.replace(/^\uFEFF/, ''); 
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // DETERMINAZIONE DELIMITATORE (Punto e virgola vs Virgola)
    const firstLine = lines[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount >= commaCount ? ';' : ',';
    
    // Parse headers
    const headers = parseCsvLine(lines[0].toLowerCase(), delimiter).map(h => cleanCsvString(h));
    
    // Cerchiamo le colonne chiave
    const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
    const channelIdx = headers.findIndex(h => h.includes('canale') || h.includes('social') || h.includes('channel') || h.includes('piattaforma'));
    const countIdx = headers.findIndex(h => h.includes('follower') || h.includes('count') || h.includes('numero') || h.includes('iscritti') || h.includes('valore'));

    if (dateIdx === -1 || channelIdx === -1 || countIdx === -1) {
        throw new Error(`Struttura CSV non valida. Colonne trovate: ${headers.join(', ')}. Richieste: Canale, Data, Follower.`);
    }

    const groupedStats: Record<string, Record<string, number>> = {};
    const dateFormats = [
        'DD/MM/YYYY', 'DD-MM-YYYY', 'D/M/YYYY', 'D-M-YYYY', // Italian formats
        'YYYY-MM-DD', 'YYYY/MM/DD', // ISO formats
        'MM/DD/YYYY', 'D-MMM-YY', 'DD-MMM-YY', 'D/MMM/YY' // Other formats
    ];

    // Variabile per il "Fill Forward" della data
    let lastValidDateStr: string | null = null;

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        
        // Controllo rilassato: ci servono almeno i dati di Canale e Conteggio. 
        // La data può essere vuota (fill forward) o a un indice basso, ma il canale/conteggio potrebbero essere dopo.
        const maxRequiredIdx = Math.max(channelIdx, countIdx);
        if (values.length <= maxRequiredIdx) continue;

        let rawDate = values[dateIdx];
        const rawChannel = values[channelIdx];
        const rawCount = values[countIdx];

        if (!rawChannel || !rawCount) continue;

        // Gestione Data con Fill-Forward (se la cella data è vuota, usa l'ultima valida)
        let dateKey = '';
        
        if (rawDate && rawDate.trim().length > 0) {
            let parsedDate = moment(rawDate, dateFormats, true);
            if (!parsedDate.isValid()) {
                // Fallback lasco
                parsedDate = moment(rawDate);
            }

            if (parsedDate.isValid()) {
                dateKey = parsedDate.format('YYYY-MM-DD');
                lastValidDateStr = dateKey;
            }
        }
        
        // Se non abbiamo trovato una data valida in questa riga, usiamo l'ultima valida
        if (!dateKey && lastValidDateStr) {
            dateKey = lastValidDateStr;
        }

        // Se ancora non abbiamo una data, saltiamo la riga
        if (!dateKey) continue;

        // Parse Nome Canale: USIAMO LA NUOVA FUNZIONE DI NORMALIZZAZIONE
        const mappedChannel = normalizeChannelName(rawChannel);

        // Parse Conteggio
        const cleanCount = rawCount.replace(/[^0-9]/g, ''); 
        const count = parseInt(cleanCount, 10);

        if (isNaN(count)) continue;

        if (!groupedStats[dateKey]) {
            groupedStats[dateKey] = {};
        }
        
        groupedStats[dateKey][mappedChannel] = count;
    }

    // Converti la mappa aggregata in array FollowerStat
    return Object.entries(groupedStats).map(([date, channels]) => {
        const total = Object.entries(channels).reduce((acc, [name, val]) => {
            if (EXCLUDED_FROM_TOTAL.includes(name)) return acc;
            return acc + val;
        }, 0);

        return {
            date,
            channels,
            total
        };
    }).sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf()); 
};
