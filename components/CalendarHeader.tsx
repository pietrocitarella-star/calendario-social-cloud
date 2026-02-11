
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SocialChannel, AppNotification, PostStatus, Post } from '../types';
import { POST_STATUSES, STATUS_COLORS } from '../constants';
import moment from 'moment';

interface CalendarHeaderProps {
  onAddPost: () => void;
  onShowReports: () => void;
  onShowChannels: () => void;
  onShowTeam: () => void;
  onShowCampaigns: () => void;
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
  activeStatusFilters?: PostStatus[];
  onToggleStatus?: (status: PostStatus) => void;
  statusCounts?: Record<string, number>;
  onShowFollowers?: () => void;
  ghostChannels?: string[];
  
  // PROPS PER LA RICERCA GLOBALE AVANZATA
  allPosts?: Post[]; 
  onSearchResultSelect?: (post: Post) => void; 
  onSearchSubmit?: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ 
    onAddPost, 
    onShowReports, 
    onShowChannels, 
    onShowTeam, 
    onShowCampaigns,
    onExportJson, 
    onExportCsv, 
    onImport,
    searchTerm = '',
    onSearchChange,
    fileInputRef,
    channels = [],
    activeFilters = [],
    onToggleChannel,
    notifications = [],
    onNotificationClick,
    onShowChangelog,
    activeStatusFilters = [],
    onToggleStatus,
    statusCounts = {},
    onShowFollowers,
    ghostChannels = [],
    allPosts = [],
    onSearchResultSelect,
    onSearchSubmit
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setShowSearchResults(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // LOGICA RICERCA "SPOTLIGHT"
  const totalMatches = useMemo(() => {
      if (!searchTerm || searchTerm.length < 2 || !allPosts) return [];
      const lowerTerm = searchTerm.toLowerCase();
      return allPosts.filter(p => p.title.toLowerCase().includes(lowerTerm) || (p.notes && p.notes.toLowerCase().includes(lowerTerm)));
  }, [searchTerm, allPosts]);

  const dropdownResults = useMemo(() => {
      return totalMatches
          .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())
          .slice(0, 5); 
  }, [totalMatches]);

  useEffect(() => {
      if (searchTerm.length >= 2) {
          setShowSearchResults(true);
      } else {
          setShowSearchResults(false);
      }
  }, [searchTerm]);

  const handleResultClick = (post: Post) => {
      if (onSearchResultSelect) {
          onSearchResultSelect(post);
          setShowSearchResults(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearchSubmit && searchTerm.length >= 2) {
          setShowSearchResults(false);
          onSearchSubmit();
      }
  };

  const handleViewAllClick = () => {
      if (onSearchSubmit) {
          setShowSearchResults(false);
          onSearchSubmit();
      }
  };

  const handleImportClick = () => {
      if (fileInputRef && fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

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
                        v2.9.2
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-3 flex-wrap justify-center xl:justify-end w-full">
                
                {/* SEARCH BAR AVANZATA */}
                {onSearchChange && (
                    <div className="relative flex-grow max-w-xs min-w-[200px]" ref={searchRef}>
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
                            onFocus={() => { if(searchTerm.length >= 2) setShowSearchResults(true); }}
                            onKeyDown={handleKeyDown}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                        
                        {/* DROPDOWN RISULTATI */}
                        {showSearchResults && dropdownResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] max-h-96 overflow-hidden flex flex-col">
                                <div className="p-2 border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase font-bold text-gray-400 bg-gray-50 dark:bg-gray-900/50 flex justify-between">
                                    <span>Anteprima ({dropdownResults.length} di {totalMatches.length})</span>
                                    <span className="text-[9px]">Premi Invio per tutti</span>
                                </div>
                                <ul className="overflow-y-auto max-h-60">
                                    {dropdownResults.map(post => {
                                        const channel = channels.find(c => c.name === post.social);
                                        const color = channel ? channel.color : '#9ca3af';
                                        return (
                                            <li key={post.id}>
                                                <button
                                                    onClick={() => handleResultClick(post)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div 
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                                            style={{ backgroundColor: color }}
                                                            title={post.social}
                                                        ></div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                                {post.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <span>{moment(post.date).format('DD MMM YY')}</span>
                                                                <span>•</span>
                                                                <span className="capitalize">{post.social}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 ml-2">
                                                        <span className={`w-2 h-2 block rounded-full ${STATUS_COLORS[post.status]}`} title={post.status}></span>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <button 
                                    onClick={handleViewAllClick}
                                    className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-bold text-center hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border-t border-blue-100 dark:border-blue-800"
                                >
                                    Vedi tutti i {totalMatches.length} risultati
                                </button>
                            </div>
                        )}
                        {showSearchResults && searchTerm.length >= 2 && dropdownResults.length === 0 && (
                             <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                 Nessun post trovato.
                             </div>
                        )}
                    </div>
                )}

                {/* --- PULSANTIERE STRUMENTI --- */}
                <div className="flex gap-2">
                    <button onClick={onShowReports} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap" title="Statistiche">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                        <span className="hidden lg:inline">Report</span>
                    </button>
                    {onShowFollowers && (
                        <button onClick={onShowFollowers} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors shadow-sm whitespace-nowrap" title="Follower">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span className="hidden lg:inline">Follower</span>
                        </button>
                    )}
                    <button onClick={onShowChannels} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap" title="Canali">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                         <span className="hidden lg:inline">Canali</span>
                    </button>
                    <button onClick={onShowTeam} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm whitespace-nowrap" title="Team">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                         <span className="hidden lg:inline">Team</span>
                    </button>
                    <button onClick={onShowCampaigns} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors shadow-sm whitespace-nowrap" title="Campagne">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                         <span className="hidden lg:inline">Campagne</span>
                    </button>
                </div>

                <div className="h-8 border-l border-gray-300 dark:border-gray-600 mx-1 hidden xl:block"></div>

                {/* --- DATA IMPORT/EXPORT TOOLS (RESTYLED) --- */}
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                    <button 
                        onClick={onExportCsv} 
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 rounded-md transition-all relative group"
                        title="Esporta CSV"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    <button 
                        onClick={onExportJson} 
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 rounded-md transition-all font-mono text-xs font-bold relative group"
                        title="Esporta JSON (Backup)"
                    >
                        JSON
                    </button>
                    
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    
                    <button 
                        onClick={handleImportClick} 
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all relative group"
                        title="Importa CSV/JSON"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </button>
                    
                    {/* Hidden Input for Import */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={onImport} 
                        className="hidden" 
                        accept=".csv,.json" 
                    />
                </div>

                <div className="h-8 border-l border-gray-300 dark:border-gray-600 mx-1 hidden xl:block"></div>

                <button
                onClick={onAddPost}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors whitespace-nowrap font-semibold text-sm flex items-center gap-2"
                >
                <span className="text-lg">+</span> Post
                </button>
            </div>
        </div>
        
        {/* Quick Filters Row */}
        <div className="flex flex-col gap-3">
            {/* Canali Filters */}
            {(channels.length > 0 || ghostChannels.length > 0) && onToggleChannel && (
                <div className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Canali:</span>
                    
                    {/* Canali Ufficiali */}
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

                    {/* Canali Fantasma (Es. 'Generico' o eliminati) */}
                    {ghostChannels.length > 0 && (
                        <>
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                            {ghostChannels.map(gName => {
                                const isActive = activeFilters.includes(gName);
                                return (
                                    <button
                                        key={gName}
                                        onClick={() => onToggleChannel(gName)}
                                        className={`
                                            px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 border border-gray-300 dark:border-gray-500 flex items-center gap-1
                                            ${isActive 
                                                ? 'bg-gray-600 text-white shadow-sm' 
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}
                                        `}
                                        title="Questo canale è presente nei post ma non nelle impostazioni"
                                    >
                                        ⚠️ {gName}
                                    </button>
                                );
                            })}
                        </>
                    )}

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

            {/* Status Filters */}
            {onToggleStatus && (
                <div className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                     <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Stato:</span>
                     {POST_STATUSES.map(status => {
                         const isActive = activeStatusFilters.includes(status);
                         const isSelected = activeStatusFilters.length > 0 ? isActive : true;
                         const count = statusCounts[status] || 0;
                         const statusColorClass = STATUS_COLORS[status];
                         
                         return (
                            <button
                                key={status}
                                onClick={() => onToggleStatus(status)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                                    ${isSelected 
                                        ? `${statusColorClass} text-white shadow-sm border-transparent` 
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}
                                `}
                            >
                                <span className="capitalize">{status}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                    {count}
                                </span>
                            </button>
                         );
                     })}
                     {activeStatusFilters.length > 0 && (
                        <button 
                            onClick={() => activeStatusFilters.forEach(s => onToggleStatus(s))} 
                            className="text-xs text-gray-500 underline ml-auto hover:text-gray-800 dark:hover:text-gray-200"
                        >
                            Reset filtri
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default CalendarHeader;
