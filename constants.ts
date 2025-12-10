
import { PostStatus, PostType } from './types';

// Ordiniamo alfabeticamente i tipi di post per migliorare l'UX nei menu a tendina
export const POST_STATUSES: PostStatus[] = Object.values(PostStatus);
export const POST_TYPES: PostType[] = Object.values(PostType).sort((a, b) => a.localeCompare(b));

export const STATUS_COLORS: Record<PostStatus, string> = {
    [PostStatus.NotStarted]: 'bg-gray-400',
    [PostStatus.Draft]: 'bg-yellow-400',
    [PostStatus.NeedsApproval]: 'bg-orange-400',
    [PostStatus.Waiting]: 'bg-indigo-400',
    [PostStatus.Scheduled]: 'bg-blue-400',
    [PostStatus.Published]: 'bg-green-500',
};
