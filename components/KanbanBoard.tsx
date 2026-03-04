import React, { useState, useMemo } from 'react';
import { Post, PostStatus, SocialChannel, KanbanTimeFilter } from '../types';
import { STATUS_COLORS, POST_STATUSES } from '../constants';
import moment from 'moment';

interface KanbanBoardProps {
    posts: Post[];
    socialChannels: SocialChannel[];
    onUpdatePostStatus: (post: Post, newStatus: PostStatus) => void;
    onEditPost: (post: Post) => void;
    
    // Props per filtri temporali gestiti dal padre (App.tsx)
    timeFilter: KanbanTimeFilter;
    setTimeFilter: (filter: KanbanTimeFilter) => void;
    customStartDate: string;
    setCustomStartDate: (date: string) => void;
    customEndDate: string;
    setCustomEndDate: (date: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    posts, 
    socialChannels, 
    onUpdatePostStatus, 
    onEditPost,
    timeFilter,
    setTimeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate
}) => {
    const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

    // Filtra i post in base al periodo selezionato (anche se App.tsx filtra già la subscription,
    // è utile filtrare qui per sicurezza o per raffinare la vista se la subscription è più ampia)
    const filteredPosts = useMemo(() => {
        const now = moment();
        return posts.filter(post => {
            const postDate = moment(post.date);
            switch (timeFilter) {
                case 'WEEK':
                    return postDate.isSame(now, 'week');
                case 'MONTH':
                    return postDate.isSame(now, 'month');
                case 'NEXT_MONTH':
                    return postDate.isSame(now.clone().add(1, 'month'), 'month');
                case 'CUSTOM':
                    return postDate.isBetween(customStartDate, customEndDate, 'day', '[]');
                case 'ALL':
                default:
                    return true;
            }
        });
    }, [posts, timeFilter, customStartDate, customEndDate]);

    const [orderedStatuses, setOrderedStatuses] = useState<PostStatus[]>(POST_STATUSES);
    const [draggedColumnStatus, setDraggedColumnStatus] = useState<PostStatus | null>(null);

    // Raggruppa i post per stato
    const columns = useMemo(() => {
        const groups: Record<string, Post[]> = {};
        orderedStatuses.forEach(status => {
            groups[status] = filteredPosts.filter(p => p.status === status);
        });
        return groups;
    }, [filteredPosts, orderedStatuses]);

    // --- DRAG & DROP POST ---
    const handleDragStart = (e: React.DragEvent, postId: string) => {
        e.stopPropagation(); // Evita che parta il drag della colonna
        setDraggedPostId(postId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('type', 'POST'); // Identifica che stiamo spostando un post
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStatus: PostStatus) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Se stiamo spostando una colonna
        if (draggedColumnStatus) {
            handleColumnDrop(targetStatus);
            return;
        }

        // Se stiamo spostando un post
        if (!draggedPostId) return;

        const post = posts.find(p => p.id === draggedPostId);
        if (post && post.status !== targetStatus) {
            onUpdatePostStatus(post, targetStatus);
        }
        setDraggedPostId(null);
    };

    // --- DRAG & DROP COLONNE ---
    const handleColumnDragStart = (e: React.DragEvent, status: PostStatus) => {
        setDraggedColumnStatus(status);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('type', 'COLUMN');
    };

    const handleColumnDrop = (targetStatus: PostStatus) => {
        if (!draggedColumnStatus || draggedColumnStatus === targetStatus) {
            setDraggedColumnStatus(null);
            return;
        }

        const newOrder = [...orderedStatuses];
        const draggedIdx = newOrder.indexOf(draggedColumnStatus);
        const targetIdx = newOrder.indexOf(targetStatus);

        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColumnStatus);

        setOrderedStatuses(newOrder);
        setDraggedColumnStatus(null);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
            {/* Toolbar Filtri Temporali */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 flex flex-col sm:flex-row gap-2 overflow-x-auto items-start sm:items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setTimeFilter('ALL')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${timeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        Tutti
                    </button>
                    <button
                        onClick={() => setTimeFilter('WEEK')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${timeFilter === 'WEEK' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        Questa Settimana
                    </button>
                    <button
                        onClick={() => setTimeFilter('MONTH')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${timeFilter === 'MONTH' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        Questo Mese
                    </button>
                    <button
                        onClick={() => setTimeFilter('NEXT_MONTH')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${timeFilter === 'NEXT_MONTH' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        Prossimo Mese
                    </button>
                    <button
                        onClick={() => setTimeFilter('CUSTOM')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${timeFilter === 'CUSTOM' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        Personalizzato
                    </button>
                </div>

                {timeFilter === 'CUSTOM' && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 animate-fadeIn">
                        <input 
                            type="date" 
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="text-xs border-none bg-transparent text-gray-700 dark:text-gray-300 focus:ring-0"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="text-xs border-none bg-transparent text-gray-700 dark:text-gray-300 focus:ring-0"
                        />
                    </div>
                )}
            </div>

            <div className="flex-grow flex overflow-x-auto pb-4 gap-4 p-4">
            {orderedStatuses.map(status => (
                <div 
                    key={status}
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, status)}
                    className={`flex-shrink-0 w-80 flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm max-h-full transition-opacity ${draggedColumnStatus === status ? 'opacity-50 border-dashed border-2' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                >
                    {/* Header Colonna */}
                    <div className={`p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-gray-50 dark:bg-gray-800 rounded-t-lg z-10 border-t-4 ${getBorderColorClass(status)} cursor-grab active:cursor-grabbing`}>
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wider">
                                {status}
                            </h3>
                        </div>
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">
                            {columns[status]?.length || 0}
                        </span>
                    </div>

                    {/* Lista Card */}
                    <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {columns[status]?.map(post => {
                            const channel = socialChannels.find(c => c.name === post.social);
                            return (
                                <div
                                    key={post.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, post.id!)}
                                    onClick={() => onEditPost(post)}
                                    className={`
                                        bg-white dark:bg-gray-750 p-3 rounded shadow-sm border border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:shadow-md transition-all
                                        ${draggedPostId === post.id ? 'opacity-50' : 'opacity-100'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span 
                                            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded uppercase"
                                            style={{ backgroundColor: channel?.color || '#999' }}
                                        >
                                            {post.social}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {moment(post.date).format('DD MMM')}
                                        </span>
                                    </div>
                                    
                                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 line-clamp-2">
                                        {post.title}
                                    </h4>

                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 capitalize">
                                            {post.postType}
                                        </span>
                                        {post.assignedTo && (
                                            <span className="text-[10px] text-gray-400" title="Assegnato">
                                                👤
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {columns[status]?.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-xs italic border-2 border-dashed border-gray-200 dark:border-gray-700 rounded">
                                Trascina qui
                            </div>
                        )}
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};

// Helper per mappare i colori di stato (che sono classi Tailwind bg-...) a classi border-...
// Nota: STATUS_COLORS restituisce 'bg-blue-400', noi vogliamo un colore per il bordo.
// Per semplicità usiamo una mappa diretta o convertiamo la stringa.
const getBorderColorClass = (status: PostStatus): string => {
    const bgClass = STATUS_COLORS[status];
    // Mappa approssimativa da bg-X-Y a border-X-Y
    // Es. bg-yellow-400 -> border-yellow-400
    return bgClass.replace('bg-', 'border-');
};

export default KanbanBoard;
