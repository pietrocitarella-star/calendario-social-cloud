
import { Post, PostStatus, PostType, TeamMember } from '../types';
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

// Mappa colonne CSV (case insensitive) -> Proprietà Post (o chiavi interne temporanee)
// AGGIORNATO: Aggiunte molte varianti per garantire flessibilità
const CSV_MAPPING: Record<string, string> = {
    // TITOLO
    'titolo': 'title',
    'title': 'title',
    'oggetto': 'title',
    'nome post': 'title',
    
    // DATA
    'data': 'date',
    'date': 'date',
    'giorno': 'date',
    'day': 'date',
    
    // ORA (Opzionale, viene unita alla data)
    'ora': 'timeStr',
    'orario': 'timeStr',
    'time': 'timeStr',
    
    // CANALE
    'social': 'social',
    'canale': 'social',
    'channel': 'social',
    'piattaforma': 'social',
    'network': 'social',
    
    // STATO
    'stato': 'status',
    'status': 'status',
    'stato post': 'status',
    
    // TIPO
    'tipo': 'postType',
    'type': 'postType',
    'post type': 'postType',
    'tipologia': 'postType',
    'formato': 'postType',
    
    // NOTE / COPY
    'note': 'notes',
    'notes': 'notes',
    'copy': 'notes',
    'testo': 'notes',
    'descrizione': 'notes',
    'caption': 'notes',
    
    // LINK ESTERNO (Destinazione)
    'link': 'externalLink',
    'externallink': 'externalLink',
    'link esterno': 'externalLink',
    'url': 'externalLink',
    'link destinazione': 'externalLink',
    'url post': 'externalLink',
    'landing page': 'externalLink',
    
    // LINK CREATIVITÀ (Grafica/Video)
    'creatività': 'creativityLink',
    'creativita': 'creativityLink', // senza accento
    'creativity': 'creativityLink',
    'creativitylink': 'creativityLink',
    'media': 'creativityLink',
    'asset': 'creativityLink',
    'grafica': 'creativityLink',
    'link grafica': 'creativityLink',
    'immagine': 'creativityLink',
    'video': 'creativityLink',
    
    // ASSEGNATO A
    'assegnato a': 'assignedTo',
    'assegnato': 'assignedTo',
    'assignedto': 'assignedTo',
    'assigned': 'assignedTo',
    'owner': 'assignedTo',
    'chi': 'assignedTo',
    'responsabile': 'assignedTo'
};

// Pulisce le stringhe da caratteri problematici (smart quotes, invisible chars)
// Risolve problemi di apostrofi rotti (’) e virgolette curve (“ ”)
const cleanCsvString = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/[\u2018\u2019]/g, "'") // Sostituisci Smart Single Quotes con apostrofo standard
        .replace(/[\u201C\u201D]/g, '"') // Sostituisci Smart Double Quotes con virgolette standard
        .replace(/\u2026/g, "...")     // Ellipsis
        .trim();
};

// Funzione helper per parsare una riga CSV gestendo le virgolette
const parseCsvLine = (line: string, delimiter: string): string[] => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    // Normalizziamo la riga prima del parsing per evitare che smart quotes rompano la logica CSV se usate impropriamente
    // Manteniamo però intatta la struttura dei delimitatori
    const cleanedLine = line.replace(/[\u201C\u201D]/g, '"'); 

    for (let i = 0; i < cleanedLine.length; i++) {
        const char = cleanedLine[i];
        
        if (char === '"') {
            if (inQuotes && cleanedLine[i + 1] === '"') {
                // Doppie virgolette dentro una stringa quotata -> una virgoletta singola
                current += '"';
                i++;
            } else {
                // Inizio o fine stringa quotata
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
    // Rimuove il BOM (Byte Order Mark) se presente all'inizio del file (comune in UTF-8 Excel)
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Rileva delimitatore (virgola o punto e virgola)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    // Pulisce headers
    const headers = parseCsvLine(lines[0].toLowerCase(), delimiter).map(h => cleanCsvString(h).replace(/^"|"$/g, ''));
    
    const posts: Post[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i], delimiter);
        
        // Salta righe vuote o malformate
        if (values.length < 2) continue;

        // Usiamo 'any' temporaneamente per gestire campi extra come 'timeStr'
        const postData: any = {
            status: PostStatus.Draft,
            postType: PostType.Post,
            history: []
        };

        // GESTIONE INDIPENDENTE DALL'ORDINE DELLE COLONNE
        headers.forEach((header, index) => {
            const mappedKey = CSV_MAPPING[header];
            
            // Se l'header è riconosciuto e c'è un valore in quella posizione
            if (mappedKey && values[index] !== undefined) {
                let value = values[index];
                
                // Rimuovi virgolette esterne
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                
                // Applica pulizia caratteri speciali (smart quotes, etc.)
                value = cleanCsvString(value);
                
                // Fix specifico per link che a volte arrivano con spazi strani
                if (mappedKey === 'externalLink' || mappedKey === 'creativityLink') {
                     value = value.replace(/\s/g, ''); 
                }

                postData[mappedKey] = value;
            }
        });

        // 1. GESTIONE DATA E ORA (Concatenazione)
        let finalDate = moment();
        
        // Formati accettati per la data
        const dateFormats = ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'D/M/YYYY', 'D-M-YYYY'];
        // Formati accettati per data+ora insieme
        const dateTimeFormats = ['YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD HH:mm', 'DD-MM-YYYY HH:mm'];

        if (postData.date) {
            if (postData.timeStr) {
                // Caso: Data e Ora in colonne separate
                // Combina stringhe (es. "25/12/2025" + " " + "10:30")
                // Pulizia ora (es. "10.30" -> "10:30")
                const cleanTime = postData.timeStr.replace('.', ':');
                const combinedString = `${postData.date} ${cleanTime}`;
                
                const parsed = moment(combinedString, dateTimeFormats.concat(['DD/MM/YYYY H:mm', 'YYYY-MM-DD H:mm']), true);
                if (parsed.isValid()) {
                    finalDate = parsed;
                }
            } else {
                // Caso: Solo colonna Data (che potrebbe contenere l'ora)
                const parsed = moment(postData.date, dateTimeFormats.concat(dateFormats), true);
                if (parsed.isValid()) {
                    finalDate = parsed;
                }
            }
        }
        postData.date = finalDate.format('YYYY-MM-DDTHH:mm');
        delete postData.timeStr; // Pulizia campo temporaneo

        // 2. GESTIONE STATO
        if (postData.status) {
             const normalizedStatus = postData.status.toLowerCase();
             const matchedStatus = Object.values(PostStatus).find(s => s.toLowerCase() === normalizedStatus);
             if (matchedStatus) postData.status = matchedStatus;
        }

        // 3. GESTIONE TIPO
        if (postData.postType) {
            const normalizedType = postData.postType.toLowerCase();
            const matchedType = Object.values(PostType).find(t => t.toLowerCase() === normalizedType);
            if (matchedType) postData.postType = matchedType;
        }

        // 4. GESTIONE ASSEGNATO A (Risoluzione Nome -> ID)
        if (postData.assignedTo && teamMembers.length > 0) {
            const rawAssignee = postData.assignedTo.toLowerCase();
            // Cerca per match esatto ID o match parziale nome
            const matchedMember = teamMembers.find(m => 
                m.id === postData.assignedTo || 
                m.name.toLowerCase().trim() === rawAssignee.trim() ||
                m.name.toLowerCase().includes(rawAssignee.trim())
            );
            
            if (matchedMember) {
                postData.assignedTo = matchedMember.id;
            } else {
                // Se non troviamo il membro (es. typo), rimuoviamo l'assegnazione
                postData.assignedTo = undefined;
            }
        }

        // Defaults finali
        if (!postData.title) postData.title = '(Senza Titolo)';
        if (!postData.social) postData.social = 'Generico'; 

        posts.push(postData as Post);
    }

    return posts;
};
