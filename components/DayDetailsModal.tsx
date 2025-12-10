
import React from 'react';
import { Post, TeamMember, SocialChannel } from '../types';
import { STATUS_COLORS } from '../constants';
import moment from 'moment';

interface DayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    posts: Post[];
    teamMembers: TeamMember[];
    channels: SocialChannel[];
    onEditPost: (post: Post) => void;
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ 
    isOpen, 
    onClose, 
    date, 
    posts, 
    teamMembers, 
    channels,
    onEditPost 
}) => {
    if (!isOpen || !date) return null;

    // Ordina i post per orario
    const sortedPosts = [...posts].sort((a, b) => 
        moment(a.date).valueOf() - moment(b.date).valueOf()
    );

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                            {moment(date).format('dddd D MMMM YYYY')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {sortedPosts.length} post programmati per questo giorno
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content List (Agenda Style) */}
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
                    {sortedPosts.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Nessun post per questa data.</div>
                    ) : (
                        <div className="space-y-3">
                            {sortedPosts.map(post => {
                                const statusColor = STATUS_COLORS[post.status];
                                const assignee = teamMembers.find(m => m.id === post.assignedTo);
                                const channel = channels.find(c => c.name === post.social);
                                const channelColor = channel ? channel.color : '#9ca3af';

                                return (
                                    <div 
                                        key={post.id} 
                                        onClick={() => { onClose(); onEditPost(post); }}
                                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer group"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            
                                            {/* Left: Time & Title */}
                                            <div className="flex items-start gap-4 flex-grow">
                                                <div className="text-sm font-mono font-semibold text-gray-500 dark:text-gray-400 pt-0.5 min-w-[45px]">
                                                    {moment(post.date).format('HH:mm')}
                                                </div>
                                                
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span 
                                                            className="text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm uppercase tracking-wide"
                                                            style={{ backgroundColor: channelColor }}
                                                        >
                                                            {post.social}
                                                        </span>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {post.title}
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                        {post.notes || 'Nessuna nota...'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right: Meta details */}
                                            <div className="flex items-center gap-3 flex-shrink-0 mt-2 sm:mt-0 pl-14 sm:pl-0">
                                                
                                                {/* Post Type */}
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 text-[10px] uppercase font-medium border border-gray-200 dark:border-gray-600">
                                                    {post.postType}
                                                </span>

                                                {/* Status */}
                                                <div className="flex items-center gap-1.5" title={`Stato: ${post.status}`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
                                                </div>

                                                {/* Avatar */}
                                                {assignee ? (
                                                    <div 
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border-2 border-white dark:border-gray-800" 
                                                        style={{ backgroundColor: assignee.color }}
                                                        title={`Assegnato a: ${assignee.name}`}
                                                    >
                                                        {assignee.name.substring(0, 1).toUpperCase()}
                                                    </div>
                                                ) : (
                                                    <div className="w-7 h-7 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-300 text-[10px]">
                                                        ?
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DayDetailsModal;
