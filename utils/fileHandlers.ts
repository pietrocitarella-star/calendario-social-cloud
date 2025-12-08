import { Post } from '../types';

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
    const preferredOrder = ['id', 'title', 'date', 'social', 'status', 'postType', 'notes', 'externalLink', 'creativityLink', 'history'];
    
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
             // Questo permette di conservare la struttura dati all'interno di una singola cella
             cellString = JSON.stringify(cell);
        } else {
             cellString = String(cell);
        }

        // Escape standard CSV (RFC 4180)
        // Se contiene virgolette, virgole o newline, racchiudi tra virgolette e raddoppia le virgolette interne.
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