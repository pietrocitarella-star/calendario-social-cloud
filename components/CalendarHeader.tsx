
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SocialChannel, PostStatus, Post } from '../types';
import { POST_STATUSES, STATUS_COLORS } from '../constants';
import moment from 'moment';

interface CalendarHeaderProps {
  onAddPost: () => void;
  onShowReports: () => void;
  onShowChannels: () => void;
  onShowTeam: () => void;
  onShowCampaigns: () => void;
  onShowInstitutionalCampaigns?: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  channels?: SocialChannel[];
  activeFilters?: string[];
  onToggleChannel?: (channelName: string) => void;
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

  // PROPS PER KANBAN
  currentViewMode?: 'CALENDAR' | 'KANBAN';
  onViewModeChange?: (mode: 'CALENDAR' | 'KANBAN') => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ 
    onAddPost, 
    onShowReports, 
    onShowChannels, 
    onShowTeam, 
    onShowCampaigns,
    onShowInstitutionalCampaigns,
    onExportJson, 
    onExportCsv, 
    onImport,
    searchTerm = '',
    onSearchChange,
    fileInputRef,
    channels = [],
    activeFilters = [],
    onToggleChannel,
    onShowChangelog,
    activeStatusFilters = [],
    onToggleStatus,
    statusCounts = {},
    onShowFollowers,
    ghostChannels = [],
    allPosts = [],
    onSearchResultSelect,
    onSearchSubmit,
    currentViewMode = 'CALENDAR',
    onViewModeChange
}) => {
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
      setShowSearchResults(searchTerm.length >= 2);
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
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full xl:w-auto">
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
                            v2.14.0
                        </button>
                    )}
                </div>
                
                {/* SEARCH BAR AVANZATA */}
                {onSearchChange && (
                    <div className="relative w-full md:w-64 flex-shrink-0 md:ml-4" ref={searchRef}>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
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
                            className="pl-9 pr-4 py-1.5 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 shadow-sm transition-all"
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
                                                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div 
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                                            style={{ backgroundColor: color }}
                                                            title={post.social}
                                                        ></div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
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
                                    className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-bold text-center hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border-t border-indigo-100 dark:border-indigo-800"
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
            </div>
            
            <div className="flex items-center gap-3 flex-wrap justify-center xl:justify-end w-full">
                
                {/* --- PULSANTIERE STRUMENTI (UNIFIED TOOLBAR) --- */}
                <div className="flex items-center bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <button onClick={onShowReports} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-indigo-400" title="Statistiche">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                        <span className="hidden lg:inline">Report</span>
                    </button>
                    
                    {onShowFollowers && (
                        <>
                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                            <button onClick={onShowFollowers} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-pink-400" title="Follower">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                <span className="hidden lg:inline">Follower</span>
                            </button>
                        </>
                    )}
                    
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button onClick={onShowChannels} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-purple-400" title="Canali">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                         <span className="hidden lg:inline">Canali</span>
                    </button>
                    
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button onClick={onShowCampaigns} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-orange-400" title="Piani Editoriali">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                         <span className="hidden lg:inline">Piani editoriali</span>
                    </button>
                    
                    {onShowInstitutionalCampaigns && (
                        <>
                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                            <button onClick={onShowInstitutionalCampaigns} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400" title="Campagne">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                 <span className="hidden lg:inline">Campagne</span>
                            </button>
                        </>
                    )}
                    
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button onClick={onShowTeam} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-teal-400" title="Team">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                         <span className="hidden lg:inline">Team</span>
                    </button>
                </div>
            </div>
        </div>
        
        {/* Quick Filters Row */}
        <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                {/* Canali Filters */}
                {(channels.length > 0 || ghostChannels.length > 0) && onToggleChannel && (
                    <div className="flex flex-wrap gap-1.5 items-center flex-grow">
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2">Canali</span>
                    
                    {/* Canali Ufficiali */}
                    {channels.map(channel => {
                        const isActive = activeFilters.includes(channel.name);
                        const isSelected = activeFilters.length > 0 ? isActive : true;
                        
                        return (
                            <button
                                key={channel.id}
                                onClick={() => onToggleChannel(channel.name)}
                                className={`
                                    px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                                    ${isSelected 
                                        ? 'text-gray-700 bg-white shadow-sm dark:bg-gray-800 dark:text-gray-200' 
                                        : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}
                                `}
                                style={{ 
                                    borderColor: isSelected ? channel.color : 'transparent',
                                }}
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: channel.color }}></div>
                                    {channel.name}
                                </div>
                            </button>
                        );
                    })}

                    {/* Canali Fantasma (Es. 'Generico' o eliminati) */}
                    {ghostChannels.length > 0 && (
                        <>
                            <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                            {ghostChannels.map(gName => {
                                const isActive = activeFilters.includes(gName);
                                return (
                                    <button
                                        key={gName}
                                        onClick={() => onToggleChannel(gName)}
                                        className={`
                                            px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border flex items-center gap-1.5
                                            ${isActive 
                                                ? 'bg-gray-100 border-gray-300 text-gray-700 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200' 
                                                : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
                                        `}
                                        title="Questo canale è presente nei post ma non nelle impostazioni"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                        {gName}
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {activeFilters.length > 0 && (
                        <button 
                            onClick={() => activeFilters.forEach(c => onToggleChannel(c))} 
                            className="text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ml-2 transition-colors"
                        >
                            Resetta
                        </button>
                    )}
                    </div>
                )}
                
                <div className="flex items-center gap-3 flex-wrap justify-center xl:justify-end">
                    {/* VIEW SWITCHER: CALENDAR / KANBAN */}
                    {onViewModeChange && (
                        <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                            <button
                                onClick={() => onViewModeChange('CALENDAR')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                    currentViewMode === 'CALENDAR'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                }`}
                                title="Vista Calendario"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="hidden sm:inline">Calendario</span>
                            </button>
                            <button
                                onClick={() => onViewModeChange('KANBAN')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                    currentViewMode === 'KANBAN'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                }`}
                                title="Vista Bacheca (Kanban)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                                <span className="hidden sm:inline">Bacheca</span>
                            </button>
                        </div>
                    )}

                    {/* --- DATA IMPORT/EXPORT TOOLS (RESTYLED) --- */}
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                        <button 
                            onClick={onExportCsv} 
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-all relative group"
                            title="Esporta CSV"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button 
                            onClick={onExportJson} 
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-all font-mono text-[10px] font-bold relative group"
                            title="Esporta JSON (Backup)"
                        >
                            JSON
                        </button>
                        
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        
                        <button 
                            onClick={handleImportClick} 
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-all relative group"
                            title="Importa CSV/JSON"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
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

                    <button
                        onClick={onAddPost}
                        className="bg-indigo-600 text-white dark:bg-indigo-500 px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all font-semibold text-sm flex items-center gap-1.5 ml-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Nuovo Post
                    </button>
                </div>
            </div>

            {/* Status Filters */}
            {onToggleStatus && (
                <div className="flex flex-wrap gap-1.5 items-center">
                     <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2">Stato</span>
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
                                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                                    ${isSelected 
                                        ? `bg-white border-gray-200 text-gray-700 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200` 
                                        : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
                                `}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusColorClass}`}></span>
                                <span className="capitalize">{status}</span>
                                <span className={`text-[10px] font-medium ml-0.5 ${isSelected ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
                                    {count}
                                </span>
                            </button>
                         );
                     })}
                     {activeStatusFilters.length > 0 && (
                        <button 
                            onClick={() => activeStatusFilters.forEach(s => onToggleStatus(s))} 
                            className="text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ml-2 transition-colors"
                        >
                            Reset
                        </button>
                     )}
                </div>
            )}
        </div>
    </div>
  );
};

export default CalendarHeader;
