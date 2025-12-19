
import { PostStatus, PostType } from './types';

// LISTA EMAIL AUTORIZZATE (Whitelist)
// Aggiungi qui le email che possono accedere all'app.
// Tutte le altre verranno bloccate anche se fanno il login con Google corretto.
export const ALLOWED_EMAILS = [
    'pietro.citarella@gmail.com',         // <--- SOSTITUISCI CON LA TUA
    'madnap83@gmail.com',        // <--- SOSTITUISCI
    'salvatore.russo@gmail.com',        // <--- SOSTITUISCI
    
];

// Ordiniamo alfabeticamente i tipi di post per migliorare l'UX nei menu a tendina
// MODIFICA: Anche gli stati sono ora ordinati alfabeticamente
export const POST_STATUSES: PostStatus[] = Object.values(PostStatus).sort((a, b) => a.localeCompare(b));
export const POST_TYPES: PostType[] = Object.values(PostType).sort((a, b) => a.localeCompare(b));

export const STATUS_COLORS: Record<PostStatus, string> = {
    [PostStatus.NotStarted]: 'bg-gray-400',
    [PostStatus.Draft]: 'bg-yellow-400',
    [PostStatus.NeedsApproval]: 'bg-orange-400',
    [PostStatus.Waiting]: 'bg-indigo-400',
    [PostStatus.Scheduled]: 'bg-blue-400',
    [PostStatus.Published]: 'bg-green-500',
    [PostStatus.Cancelled]: 'bg-slate-600', // Grigio scuro/ardesia per Cancellato
};
