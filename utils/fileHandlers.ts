
import { Post, PostStatus, PostType, TeamMember, FollowerStat } from '../types';
import moment from 'moment';

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

const cleanCsvString = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2026/g, "...")
        .trim();
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

export const parseCsvToPosts = (csvContent: string, teamMembers: TeamMember[] = []): Post[] => {
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = parseCsvLine(lines[0].toLowerCase(), delimiter).map(h => cleanCsvString(h).replace(/^"|"$/g, ''));
    
    const posts: Post[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        if (values.length < 2) continue;

        const postData: any = {
            status: PostStatus.Draft,
            postType: PostType.Post,
            history: []
        };

        headers.forEach((header, index) => {
            const mappedKey = CSV_MAPPING[header];
            if (mappedKey && values[index] !== undefined) {
                let value = values[index];
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                value = cleanCsvString(value);
                if (mappedKey === 'externalLink' || mappedKey === 'creativityLink') value = value.replace(/\s/g, ''); 
                postData[mappedKey] = value;
            }
        });

        let finalDate = moment();
        const dateFormats = ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'D/M/YYYY', 'D-M-YYYY'];
        const dateTimeFormats = ['YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD HH:mm', 'DD-MM-YYYY HH:mm'];

        if (postData.date) {
            if (postData.timeStr) {
                const cleanTime = postData.timeStr.replace('.', ':');
                const combinedString = `${postData.date} ${cleanTime}`;
                const parsed = moment(combinedString, dateTimeFormats.concat(['DD/MM/YYYY H:mm', 'YYYY-MM-DD H:mm']), true);
                if (parsed.isValid()) finalDate = parsed;
            } else {
                const parsed = moment(postData.date, dateTimeFormats.concat(dateFormats), true);
                if (parsed.isValid()) finalDate = parsed;
            }
        }
        postData.date = finalDate.format('YYYY-MM-DDTHH:mm');
        delete postData.timeStr;

        if (postData.status) {
             const normalizedStatus = postData.status.toLowerCase();
             const matchedStatus = Object.values(PostStatus).find(s => s.toLowerCase() === normalizedStatus);
             if (matchedStatus) postData.status = matchedStatus;
        }

        if (postData.postType) {
            const normalizedType = postData.postType.toLowerCase();
            const matchedType = Object.values(PostType).find(t => t.toLowerCase() === normalizedType);
            if (matchedType) postData.postType = matchedType;
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

        posts.push(postData as Post);
    }
    return posts;
};

// --- FOLLOWER STATS IMPORT LOGIC ---

const CHANNEL_NAME_MAPPING: Record<string, string> = {
    'fb': 'Facebook', 'facebook': 'Facebook', 'face': 'Facebook',
    'ig': 'Instagram', 'insta': 'Instagram', 'instagram': 'Instagram',
    'li': 'LinkedIn', 'linkedin': 'LinkedIn', 'linked': 'LinkedIn',
    'tk': 'TikTok', 'tiktok': 'TikTok', 'tik': 'TikTok',
    'yt': 'YouTube', 'youtube': 'YouTube', 'tube': 'YouTube',
    'x': 'X', 'twitter': 'X',
    'th': 'Threads', 'threads': 'Threads',
    'wa': 'WhatsApp', 'whatsapp': 'WhatsApp',
    'tg': 'Telegram', 'telegram': 'Telegram'
};

const EXCLUDED_FROM_TOTAL = ['WhatsApp', 'Telegram'];

export const parseFollowersCsv = (csvContent: string): FollowerStat[] => {
    // Rimuove BOM
    const cleanContent = csvContent.replace(/^\uFEFF/, ''); 
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // DETERMINAZIONE DELIMITATORE (Punto e virgola vs Virgola)
    // Controlliamo la prima riga (header) per vedere quale separatore è più frequente
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
        'MM/DD/YYYY' // US fallback
    ];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        
        // Se la riga è vuota o ha meno colonne dell'indice massimo richiesto, salta
        if (values.length <= Math.max(dateIdx, channelIdx, countIdx)) continue;

        const rawDate = values[dateIdx];
        const rawChannel = values[channelIdx];
        const rawCount = values[countIdx];

        if (!rawDate || !rawChannel || !rawCount) continue;

        // Parse Data con formati multipli
        let parsedDate = moment(rawDate, dateFormats, true);
        
        // Se moment strict mode fallisce, proviamo non-strict per gestire formati Excel strani
        if (!parsedDate.isValid()) {
             parsedDate = moment(rawDate);
        }

        if (!parsedDate.isValid()) continue;
        const dateKey = parsedDate.format('YYYY-MM-DD');

        // Parse Nome Canale
        const normalizedKey = cleanCsvString(rawChannel).toLowerCase().trim();
        let mappedChannel = CHANNEL_NAME_MAPPING[normalizedKey];
        
        if (!mappedChannel) {
            // Capitalize se non trovato nel mapping
            mappedChannel = cleanCsvString(rawChannel);
            if (mappedChannel.length > 0) {
                mappedChannel = mappedChannel.charAt(0).toUpperCase() + mappedChannel.slice(1);
            }
        }

        // Parse Conteggio (rimuove punti delle migliaia se presenti in formato europeo 1.000, ma fa attenzione ai decimali)
        // Nel caso dei follower, assumiamo siano interi.
        // Rimuoviamo qualsiasi cosa non sia un numero.
        const cleanCount = rawCount.replace(/[^0-9]/g, ''); 
        const count = parseInt(cleanCount, 10);

        if (isNaN(count)) continue;

        if (!groupedStats[dateKey]) {
            groupedStats[dateKey] = {};
        }
        
        // Se per la stessa data e canale ci sono più righe (errore nel file), l'ultima vince
        groupedStats[dateKey][mappedChannel] = count;
    }

    // Converti la mappa aggregata in array FollowerStat
    return Object.entries(groupedStats).map(([date, channels]) => {
        // Calcola totale base qui (ma verrà ricalcolato dal service se avviene un merge)
        const total = Object.entries(channels).reduce((acc, [name, val]) => {
            if (EXCLUDED_FROM_TOTAL.includes(name)) return acc;
            return acc + val;
        }, 0);

        return {
            date,
            channels,
            total
        };
    }).sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf()); // Ordina per data crescente per la preview
};
