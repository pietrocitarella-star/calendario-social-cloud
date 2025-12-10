
import React, { useState, useEffect, useRef } from 'react';
import { SocialChannel, AppNotification } from '../types';
import moment from 'moment';

interface CalendarHeaderProps {
  onAddPost: () => void;
  onShowReports: () => void;
  onShowChannels: () => void;
  onShowTeam: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  channels?: SocialChannel[];
  activeFilters?: string[];
  onToggleChannel?: (channelName: string) => void;
  notifications?: AppNotification[];
  onNotificationClick?: (postId: string) => void;
  onShowChangelog?: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ 
    onAddPost, 
    onShowReports, 
    onShowChannels,
    onShowTeam,
    onExportJson, 
    onExportCsv, 
    onImport,
    searchTerm,
    onSearchChange,
    fileInputRef,
    channels = [],
    activeFilters = [],
    onToggleChannel,
    notifications = [],
    onNotificationClick,
    onShowChangelog
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 mb-4">
        {/* Top Bar: Title & Actions */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    Calendario Editoriale
                </h1>
                {onShowChangelog && (
                    <button 
                        onClick={onShowChangelog}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs font-mono rounded-full transition-colors"
                        title="Vedi cronologia versioni"
                    >
                        v1.7.3
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-3 flex-wrap justify-center xl:justify-end w-full">
                {onSearchChange && (
                    <div className="relative flex-grow max-w-xs min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Cerca post..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={onShowReports} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                        Report
                    </button>
                    <button onClick={onShowChannels} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Canali
                    </button>
                    <button onClick={onShowTeam} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm whitespace-nowrap">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Team
                    </button>
                </div>
                
                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors"
                        title="Notifiche"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {notifications.length > 0 && (
                            <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">Notifiche ({notifications.length})</h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        Nessuna nuova notifica.
                                    </div>
                                ) : (
                                    <ul>
                                        {notifications.map(note => (
                                            <li key={note.id}>
                                                <button
                                                    onClick={() => {
                                                        if (onNotificationClick) onNotificationClick(note.postId);
                                                        setShowNotifications(false);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${note.type === 'deadline' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{note.type === 'deadline' ? 'In Scadenza' : 'Approvazione Richiesta'}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{note.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{moment(note.date).calendar()}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 border-l border-gray-300 dark:border-gray-600 mx-1 hidden lg:block"></div>

                <div className="flex gap-2">
                    <input type="file" accept=".json" ref={fileInputRef} onChange={onImport} className="hidden" />
                    
                    {/* Pulsante Importa */}
                    <button 
                        onClick={() => fileInputRef?.current?.click()} 
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                        title="Importa Backup"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        Importa
                    </button>

                    {/* Pulsante JSON */}
                    <button 
                        onClick={onExportJson} 
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                        title="Scarica Backup JSON"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        JSON
                    </button>

                    {/* Pulsante CSV */}
                    <button 
                        onClick={onExportCsv} 
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        title="Esporta in CSV/Excel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        CSV
                    </button>
                </div>

                <div className="h-8 border-l border-gray-300 dark:border-gray-600 mx-1 hidden lg:block"></div>

                <button
                onClick={onAddPost}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors whitespace-nowrap font-semibold text-sm flex items-center gap-2"
                >
                <span className="text-lg">+</span> Post
                </button>
            </div>
        </div>
        
        {/* Quick Filters Row */}
        {channels.length > 0 && onToggleChannel && (
            <div className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Filtra:</span>
                {channels.map(channel => {
                    const isActive = activeFilters.includes(channel.name);
                    const isSelected = activeFilters.length > 0 ? isActive : true;
                    
                    return (
                        <button
                            key={channel.id}
                            onClick={() => onToggleChannel(channel.name)}
                            className={`
                                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                                ${isSelected 
                                    ? 'text-white shadow-sm scale-100' 
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100'}
                            `}
                            style={{ 
                                backgroundColor: isSelected ? channel.color : undefined,
                                borderColor: isSelected ? channel.color : undefined
                            }}
                        >
                            {channel.name}
                            {activeFilters.length > 0 && isActive && <span className="ml-1 text-[10px]">✕</span>}
                        </button>
                    );
                })}
                {activeFilters.length > 0 && (
                    <button 
                        onClick={() => activeFilters.forEach(c => onToggleChannel(c))} 
                        className="text-xs text-gray-500 underline ml-auto hover:text-gray-800 dark:hover:text-gray-200"
                    >
                        Reset filtri
                    </button>
                )}
            </div>
        )}
    </div>
  );
};

export default CalendarHeader;
