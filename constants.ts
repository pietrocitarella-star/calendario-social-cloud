import { PostStatus, PostType } from './types';

export const POST_STATUSES: PostStatus[] = Object.values(PostStatus);
export const POST_TYPES: PostType[] = Object.values(PostType);

export const STATUS_COLORS: Record<PostStatus, string> = {
    [PostStatus.NotStarted]: 'bg-gray-400',
    [PostStatus.Draft]: 'bg-yellow-400',
    [PostStatus.NeedsApproval]: 'bg-orange-400',
    [PostStatus.Waiting]: 'bg-indigo-400',
    [PostStatus.Scheduled]: 'bg-blue-400',
    [PostStatus.Published]: 'bg-green-500',
};
