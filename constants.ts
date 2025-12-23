
import { PostStatus, PostType } from './types';

// LISTA EMAIL AUTORIZZATE (Whitelist)
export const ALLOWED_EMAILS = [
    'pietro.citarella@gmail.com',
    'madnap83@gmail.com',
    'salvatore.russo@gmail.com',
];

export const POST_STATUSES: PostStatus[] = Object.values(PostStatus).sort((a, b) => a.localeCompare(b));
export const POST_TYPES: PostType[] = Object.values(PostType).sort((a, b) => a.localeCompare(b));

export const STATUS_COLORS: Record<PostStatus, string> = {
    [PostStatus.NotStarted]: 'bg-gray-400',
    [PostStatus.Draft]: 'bg-yellow-400',
    [PostStatus.NeedsApproval]: 'bg-orange-400',
    [PostStatus.Waiting]: 'bg-indigo-400',
    [PostStatus.Scheduled]: 'bg-blue-400',
    [PostStatus.Published]: 'bg-green-500',
    [PostStatus.Sponsored]: 'bg-rose-500', // Colore Rose per sponsorizzati
    [PostStatus.Cancelled]: 'bg-slate-600',
    [PostStatus.Collaboration]: 'bg-fuchsia-600',
};
