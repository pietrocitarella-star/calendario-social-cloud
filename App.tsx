
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { Calendar, momentLocalizer, Views, EventProps, ToolbarProps, Formats, HeaderProps, DateHeaderProps } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/it'; 
import { Post, CalendarEvent, PostStatus, PostType, SocialChannel, AppNotification, TeamMember } from './types';
import { 
    subscribeToPosts, 
    fetchAllPosts,
    addPost, 
    updatePost, 
    deletePost, 
    deletePostsBulk,
    savePostsToStorage, 
    subscribeToChannels, 
    saveSocialChannels,
    savePostWithHistory,
    deleteChannelFromDb,
    subscribeToTeam,
    saveTeamMembers,
    deleteTeamMemberFromDb,
    migrateCollaborationData
} from './services/firestoreService';
import { STATUS_COLORS, ALLOWED_EMAILS } from './constants';
import { exportPostsToJson, exportPostsToCsv, parseCsvToPosts, ImportError } from './utils/fileHandlers';
import CalendarHeader from './components/CalendarHeader';
import CustomToolbar from './components/CustomToolbar';
import StatusLegend from './components/StatusLegend';
import LoginScreen from './components/LoginScreen';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';

const PostModal = lazy(() => import('./components/PostModal'));
const ReportsModal = lazy(() => import('./components/ReportsModal'));
const SocialChannelsModal = lazy(() => import('./components/SocialChannelsModal'));
const TeamMembersModal = lazy(() => import('./components/TeamMembersModal'));
const ChangelogModal = lazy(() => import('./components/ChangelogModal'));
const DayDetailsModal = lazy(() => import('./components/DayDetailsModal'));
const FollowersModal = lazy(() => import('./components/FollowersModal')); 

moment.locale('it');
moment.updateLocale('it', {
    months: 'Gennaio_Febbraio_Marzo_Aprile_Maggio_Giugno_Luglio_Agosto_Settembre_Ottobre_Novembre_Dicembre'.split('_'),
    monthsShort: 'Gen_Feb_Mar_Apr_Mag_Giu_Lug_Ago_Set_Ott_Nov_Dic'.split('_'),
    weekdays: 'Domenica_Lunedì_Martedì_Mercoledì_Giovedì_Venerdì_Sabato'.split('_'),
    weekdaysShort: 'Dom_Lun_Mar_Mer_Gio_Ven_Sab'.split('_'),
    weekdaysMin: 'Do_Lu_Ma_Me_Gi_Ve_Sa'.split('_'),
    longDateFormat: {
        LT: 'HH:mm',
        LTS: 'HH:mm:ss',
        L: 'DD/MM/YYYY',
        LL: 'D MMMM YYYY',
        LLL: 'D MMMM YYYY HH:mm',
        LLLL: 'dddd D MMMM YYYY HH:mm'
    },
    week: {
        dow: 1, 
        doy: 4
    }
});

const localizer = momentLocalizer(moment);

const mapPostsToEvents = (posts: Post[]): CalendarEvent[] => {
    return posts.map(post => {
        const start = new Date(post.date);
        const end = new Date(start.getTime() + 60 * 60 * 1000); 
        return {
            ...post,
            start,
            end,
        };
    });
};

const calendarMessages = {
  allDay: 'Tutto il giorno',
  previous: 'Precedente',
  next: 'Successivo',
  today: 'Oggi',
  month: 'Mese',
  week: 'Settimana',
  day: 'Giorno',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Ora',
  event: 'Dettagli Evento',
  noEventsInRange: 'Nessun post in questo periodo.',
  showMore: (total: number) => `Vedi tutti (+${total})`
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [posts, setPosts] = useState<Post[]>([]); 
    // Indice globale per la ricerca (contiene tutti i post, non solo quelli visualizzati)
    const [globalSearchIndex, setGlobalSearchIndex] = useState<Post[]>([]);
    const [isSearchMode, setIsSearchMode] = useState(false); // NUOVO STATO RICERCA
    
    const [reportPosts, setReportPosts] = useState<Post[]>([]); 
    const [isLoadingReportData, setIsLoadingReportData] = useState(false);

    const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeChannelFilters, setActiveChannelFilters] = useState<string[]>([]);
    const [activeStatusFilters, setActiveStatusFilters] = useState<PostStatus[]>([]);
    
    const [view, setView] = useState(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const [selectedEvent, setSelectedEvent] = useState<Partial<Post> | null>(null);
    
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
    const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
    const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false); 
    
    const [dayModalData, setDayModalData] = useState<{ isOpen: boolean, date: Date | null, posts: Post[] }>({
        isOpen: false,
        date: null,
        posts: []
    });

    // SELECTION MODE STATE (Agenda View)
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
    // Modale di conferma personalizzata
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const [importPreview, setImportPreview] = useState<{
        type: 'json' | 'csv';
        total: number;
        valid: number;
        invalid: number;
        data: Post[];
        errors: ImportError[]; // Nuovo campo errori
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Ref per prevenire l'apertura del modale "Nuovo Post" quando si clicca sul bottone "Mostra Altri"
    const interactionBlockerRef = useRef(false);

    const defaultScrollTime = useMemo(() => new Date(1970, 1, 1, 9, 0, 0), []);

    const calendarFormats = useMemo<Formats>(() => ({
        monthHeaderFormat: (date, culture, local) => local.format(date, 'MMMM YYYY', culture),
        weekdayFormat: (date, culture, local) => local.format(date, 'dddd', culture),
        dayHeaderFormat: (date, culture, local) => local.format(date, 'dddd DD/MM/YYYY', culture),
        dayRangeHeaderFormat: ({ start, end }, culture, local) =>
            local.format(start, 'DD MMM', culture) + ' - ' + local.format(end, 'DD MMM YYYY', culture),
        agendaDateFormat: (date, culture, local) => local.format(date, 'ddd DD MMM', culture),
    }), []); 

    // Reset selezione quando cambia la vista
    useEffect(() => {
        if (view !== Views.AGENDA) {
            setIsSelectionMode(false);
            setSelectedPostIds([]);
            setIsBulkDeleteModalOpen(false);
        }
    }, [view]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const isPasswordAuth = currentUser.providerData.some(p => p.providerId === 'password');
                const isGoogleAuth = currentUser.providerData.some(p => p.providerId === 'google.com');
                const email = currentUser.email;

                if (isPasswordAuth) {
                    setUser(currentUser);
                    setIsAuthorized(true);
                } else if (isGoogleAuth && email) {
                    const normalizedEmail = email.toLowerCase().trim();
                    const allowedEmailsLower = ALLOWED_EMAILS.map(e => e.toLowerCase().trim());
                    
                    if (allowedEmailsLower.includes(normalizedEmail)) {
                        setUser(currentUser);
                        setIsAuthorized(true);
                    } else {
                        setUser(currentUser);
                        setIsAuthorized(false);
                    }
                } else {
                    if (email && ALLOWED_EMAILS.map(e => e.toLowerCase().trim()).includes(email.toLowerCase().trim())) {
                         setUser(currentUser);
                         setIsAuthorized(true);
                    } else {
                        setUser(currentUser);
                        setIsAuthorized(false);
                    }
                }
            } else {
                setUser(null);
                setIsAuthorized(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // EFFETTO MIGRAZIONE DATI
    useEffect(() => {
        if (isAuthorized) {
            migrateCollaborationData();
        }
    }, [isAuthorized]);

    // LOAD POSTS FOR CALENDAR VIEW (Optimized window)
    useEffect(() => {
        if (!user || !isAuthorized) {
            setPosts([]);
            return;
        }

        const startDate = moment(date).subtract(2, 'months').startOf('month').format('YYYY-MM-DD');
        const endDate = moment(date).add(2, 'months').endOf('month').format('YYYY-MM-DD');

        const unsubscribe = subscribeToPosts(startDate, endDate, (updatedPosts) => {
            setPosts(updatedPosts);
        });
        return () => unsubscribe(); 
    }, [user, isAuthorized, date, view]);

    // LOAD GLOBAL INDEX FOR SEARCH (All history)
    useEffect(() => {
        if (!user || !isAuthorized) {
            setGlobalSearchIndex([]);
            return;
        }
        // Carichiamo tutti i post una tantum all'avvio (o quando cambia auth) per la ricerca
        const loadSearchIndex = async () => {
            const allData = await fetchAllPosts();
            setGlobalSearchIndex(allData);
        };
        loadSearchIndex();
    }, [user, isAuthorized]);

    useEffect(() => {
        if (!user || !isAuthorized) {
            setSocialChannels([]);
            return;
        }
        const unsubscribe = subscribeToChannels((updatedChannels) => {
            setSocialChannels(updatedChannels);
        });
        return () => unsubscribe();
    }, [user, isAuthorized]);

    useEffect(() => {
        if (!user || !isAuthorized) {
            setTeamMembers([]);
            return;
        }
        const unsubscribe = subscribeToTeam((updatedMembers) => {
            setTeamMembers(updatedMembers);
        });
        return () => unsubscribe();
    }, [user, isAuthorized]);

    const events = useMemo(() => mapPostsToEvents(posts), [posts]);

    // CALCOLO CANALI "FANTASMA" (Presenti nei post ma non nella lista ufficiale)
    const ghostChannels = useMemo(() => {
        const officialNames = socialChannels.map(c => c.name);
        const allPostChannels = new Set(posts.map(p => p.social));
        return Array.from(allPostChannels).filter(name => !officialNames.includes(name)).sort();
    }, [posts, socialChannels]);

    // CALCOLO RISULTATI RICERCA GLOBALI (per la vista dedicata)
    const searchResults = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const lowerTerm = searchTerm.toLowerCase();
        // Filtriamo su TUTTO lo storico (globalSearchIndex), non solo sui post del calendario
        return globalSearchIndex
            .filter(p => p.title.toLowerCase().includes(lowerTerm) || (p.notes && p.notes.toLowerCase().includes(lowerTerm)))
            .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf()); // Dal più recente
    }, [searchTerm, globalSearchIndex]);

    const handleShowReports = async () => {
        setIsLoadingReportData(true);
        // Carica tutto lo storico per i report
        const data = await fetchAllPosts();
        setReportPosts(data);
        setIsLoadingReportData(false);
        setIsReportsModalOpen(true);
    };

    const handleExportJson = async () => {
        const allData = await fetchAllPosts();
        exportPostsToJson(allData);
    };

    const handleExportCsv = async () => {
        const allData = await fetchAllPosts();
        exportPostsToCsv(allData);
    };

    // --- NUOVA FUNZIONE RICERCA GLOBALE ---
    const handleSearchResultSelect = (post: Post) => {
        // Se siamo in modalità ricerca, rimaniamo lì ma apriamo il modale.
        // Se l'utente clicca dal dropdown (senza essere in search mode), andiamo al calendario.
        if (!isSearchMode) {
            const postDate = new Date(post.date);
            setDate(postDate);
        }
        
        setTimeout(() => {
            setSelectedEvent(post);
            setIsPostModalOpen(true);
        }, 100);
    };

    const handleSearchSubmit = () => {
        setIsSearchMode(true);
    };

    const handleBackToCalendar = () => {
        setIsSearchMode(false);
        setSearchTerm(''); // Opzionale: pulire la ricerca quando si torna indietro? Meglio di sì per chiarezza.
    };

    const notifications = useMemo<AppNotification[]>(() => {
        if (!isAuthorized) return [];
        const alerts: AppNotification[] = [];
        const now = moment();
        const tomorrow = moment().add(24, 'hours');

        posts.forEach(post => {
            if (post.status === PostStatus.Scheduled && post.id) {
                const postDate = moment(post.date);
                if (postDate.isAfter(now) && postDate.isBefore(tomorrow)) {
                    alerts.push({
                        id: `deadline-${post.id}`,
                        type: 'deadline',
                        message: `Post "${post.title}" su ${post.social} in uscita a breve.`,
                        postId: post.id,
                        date: post.date
                    });
                }
            }

            if (post.status === PostStatus.NeedsApproval && post.id) {
                alerts.push({
                    id: `approval-${post.id}`,
                    type: 'approval',
                    message: `Il post "${post.title}" su ${post.social} richiede approvazione.`,
                    postId: post.id,
                    date: post.date
                });
            }
        });

        return alerts.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
    }, [posts, isAuthorized]);

    const handleNotificationClick = useCallback((postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            setSelectedEvent(post);
            setIsPostModalOpen(true);
        }
    }, [posts]);

    // FILTER LOGIC (For calendar view)
    const filteredEvents = useMemo(() => {
        let result = events;
        // Text Search visual filter for current view (only if NOT in search mode, otherwise handled by view)
        if (searchTerm.trim() && !isSearchMode) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(event => 
                event.title.toLowerCase().includes(lowerTerm) || 
                (event.notes && event.notes.toLowerCase().includes(lowerTerm))
            );
        }
        // Channel Filter
        if (activeChannelFilters.length > 0) {
            result = result.filter(event => activeChannelFilters.includes(event.social));
        }
        // Status Filter
        if (activeStatusFilters.length > 0) {
            result = result.filter(event => activeStatusFilters.includes(event.status));
        }
        return result;
    }, [events, searchTerm, isSearchMode, activeChannelFilters, activeStatusFilters]);
    
    // Status Counts Calculation
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        
        // Se siamo in search mode, contiamo i risultati della ricerca. Altrimenti i post della view.
        let baseList = isSearchMode ? searchResults : posts;

        if (!isSearchMode) {
            // Apply visual filters for Calendar
            if (searchTerm.trim()) {
                const lowerTerm = searchTerm.toLowerCase();
                baseList = baseList.filter(p => 
                    p.title.toLowerCase().includes(lowerTerm) || 
                    (p.notes && p.notes.toLowerCase().includes(lowerTerm))
                );
            }
            if (activeChannelFilters.length > 0) {
                baseList = baseList.filter(p => activeChannelFilters.includes(p.social));
            }

            let start, end;
            if (view === Views.MONTH) {
                start = moment(date).startOf('month');
                end = moment(date).endOf('month');
            } else if (view === Views.WEEK) {
                start = moment(date).startOf('week');
                end = moment(date).endOf('week');
            } else {
                start = moment(date).startOf('day');
                end = moment(date).endOf('day');
                if (view === Views.AGENDA) {
                    end = moment(date).add(30, 'days');
                }
            }
            baseList = baseList.filter(p => moment(p.date).isBetween(start, end, undefined, '[]'));
        }

        baseList.forEach(p => {
            counts[p.status] = (counts[p.status] || 0) + 1;
        });
        return counts;
    }, [posts, searchResults, isSearchMode, searchTerm, activeChannelFilters, date, view]);

    const toggleChannelFilter = useCallback((channelName: string) => {
        setActiveChannelFilters(prev => {
            if (prev.includes(channelName)) {
                return prev.filter(c => c !== channelName);
            } else {
                return [...prev, channelName];
            }
        });
    }, []);

    const toggleStatusFilter = useCallback((status: PostStatus) => {
        setActiveStatusFilters(prev => {
            if (prev.includes(status)) {
                return prev.filter(s => s !== status);
            } else {
                return [...prev, status];
            }
        });
    }, []);

    const handleCheckboxChange = useCallback((postId: string, checked: boolean) => {
        setSelectedPostIds(prev => {
            if (checked) {
                return [...prev, postId];
            } else {
                return prev.filter(id => id !== postId);
            }
        });
    }, []);

    const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
        if (interactionBlockerRef.current) {
            interactionBlockerRef.current = false;
            return;
        }
        if (isSelectionMode) return;

        if (socialChannels.length === 0) {
            alert("Attendi il caricamento dei canali o aggiungine uno.");
            return;
        }
        setSelectedEvent({
            date: moment(start).format('YYYY-MM-DDTHH:mm'),
            social: socialChannels[0].name,
            status: PostStatus.NotStarted,
            postType: PostType.Post,
            title: '',
        });
        setIsPostModalOpen(true);
    }, [socialChannels, isSelectionMode]);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        if (isSelectionMode) return;

        const post = posts.find(p => p.id === event.id);
        if (post) {
            setSelectedEvent(post);
        }
        setIsPostModalOpen(true);
    }, [posts, isSelectionMode]);

    const isPostVisible = useCallback((post: Post) => {
        if (activeChannelFilters.length > 0 && !activeChannelFilters.includes(post.social)) return false;
        if (activeStatusFilters.length > 0 && !activeStatusFilters.includes(post.status)) return false;
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            const matchesSearch = 
                post.title.toLowerCase().includes(lowerTerm) || 
                (post.notes && post.notes.toLowerCase().includes(lowerTerm));
            if (!matchesSearch) return false;
        }
        return true;
    }, [activeChannelFilters, activeStatusFilters, searchTerm]);

    const handleShowMore = useCallback((events: CalendarEvent[], date: Date) => {
        const dayStart = moment(date).startOf('day');
        const dayEnd = moment(date).endOf('day');
        const postsForDay = posts.filter(p => 
            moment(p.date).isBetween(dayStart, dayEnd, undefined, '[]') && isPostVisible(p)
        );
        setDayModalData({
            isOpen: true,
            date: date,
            posts: postsForDay
        });
    }, [posts, isPostVisible]);

    const closePostModal = useCallback(() => {
        setIsPostModalOpen(false);
        setSelectedEvent(null);
    }, []);

    const handleSavePost = useCallback(async (postToSave: Post) => {
        if (postToSave.id) {
            const originalPost = posts.find(p => p.id === postToSave.id);
            if (originalPost) {
                await savePostWithHistory(postToSave.id, originalPost, postToSave);
            } else {
                await updatePost(postToSave.id, postToSave);
            }
        } else {
            await addPost(postToSave);
        }
        // Aggiorna anche l'indice di ricerca locale per feedback immediato (opzionale, ma utile)
        const updatedIndex = [...globalSearchIndex];
        const idx = updatedIndex.findIndex(p => p.id === postToSave.id);
        if (idx >= 0) updatedIndex[idx] = postToSave;
        else updatedIndex.push(postToSave);
        setGlobalSearchIndex(updatedIndex);

        closePostModal();
    }, [closePostModal, posts, globalSearchIndex]);
    
    const handleDeletePost = useCallback(async (id: string) => {
        if (!id) return;
        await deletePost(id);
        
        // Rimuovi dall'indice di ricerca
        setGlobalSearchIndex(prev => prev.filter(p => p.id !== id));
        
        closePostModal();
    }, [closePostModal]);

    const handleBulkDeleteClick = useCallback(() => {
        if (selectedPostIds.length === 0) return;
        setIsBulkDeleteModalOpen(true);
    }, [selectedPostIds]);

    const performBulkDelete = useCallback(async () => {
        if (selectedPostIds.length === 0) return;
        try {
            await deletePostsBulk(selectedPostIds);
            // Aggiorna indice ricerca
            setGlobalSearchIndex(prev => prev.filter(p => !selectedPostIds.includes(p.id || '')));
            
            setSelectedPostIds([]);
            setIsSelectionMode(false);
            setIsBulkDeleteModalOpen(false);
        } catch (e) {
            console.error("Errore eliminazione massiva", e);
            alert("Errore durante l'eliminazione dei post. Riprova.");
        }
    }, [selectedPostIds]);

    const handleToggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => {
            if (prev) {
                setSelectedPostIds([]);
            }
            return !prev;
        });
    }, []);

    const handleSaveChannels = useCallback(async (updatedChannels: SocialChannel[]) => {
        const channelsToDelete = socialChannels.filter(c => !updatedChannels.find(uc => uc.id === c.id));
        for (const c of channelsToDelete) {
             await deleteChannelFromDb(c.id);
        }
        await saveSocialChannels(updatedChannels);
    }, [socialChannels]);

    const handleSaveTeam = useCallback(async (updatedTeam: TeamMember[]) => {
        const membersToDelete = teamMembers.filter(m => !updatedTeam.find(um => um.id === m.id));
        for (const m of membersToDelete) {
             await deleteTeamMemberFromDb(m.id);
        }
        await saveTeamMembers(updatedTeam);
    }, [teamMembers]);

    const handleImportFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const inputElement = event.target;
        const file = inputElement.files?.[0];
        if (!file) return;

        const isCsv = file.name.toLowerCase().endsWith('.csv');
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content !== 'string') return;

            try {
                let sanitizedPosts: Post[] = [];
                let importErrors: ImportError[] = [];
                let validCount = 0;
                let invalidCount = 0;
                let totalRecords = 0;

                if (isCsv) {
                    const result = parseCsvToPosts(content, teamMembers);
                    
                    // Separa i risultati validi dagli errori
                    sanitizedPosts = result.validPosts.map(p => {
                        const { id, ...rest } = p;
                        return rest as Post;
                    });
                    importErrors = result.errors;
                    
                    validCount = sanitizedPosts.length;
                    invalidCount = importErrors.length;
                    totalRecords = validCount + invalidCount;

                } else {
                    // JSON Logic (Keep simple, assume valid dates for JSON backups)
                    let importedData;
                    try {
                        importedData = JSON.parse(content);
                    } catch (jsonError) {
                        alert("Il file selezionato non contiene un JSON valido.");
                        return;
                    }
                    if (!Array.isArray(importedData)) {
                        alert("La struttura del file non è corretta (non è una lista).");
                        return;
                    }
                    totalRecords = importedData.length;
                    importedData.forEach((item: any) => {
                        if (item && typeof item === 'object') {
                            const dateIsValid = item.date && moment(item.date).isValid();
                            const newPost: Post = {
                                id: item.id || '',
                                title: item.title || '(Importato senza titolo)',
                                date: dateIsValid ? moment(item.date).format('YYYY-MM-DDTHH:mm') : moment().format('YYYY-MM-DDTHH:mm'),
                                social: item.social || (socialChannels.length > 0 ? socialChannels[0].name : 'Generico'),
                                status: Object.values(PostStatus).includes(item.status) ? item.status : PostStatus.Draft,
                                postType: Object.values(PostType).includes(item.postType) ? item.postType : PostType.Post,
                                externalLink: item.externalLink || '',
                                creativityLink: item.creativityLink || '',
                                notes: item.notes || '',
                                history: item.history || [],
                                assignedTo: item.assignedTo || undefined
                            };
                            sanitizedPosts.push(newPost);
                            validCount++;
                        } else {
                            invalidCount++;
                        }
                    });
                }
                
                if (validCount === 0 && invalidCount === 0) {
                    alert("Il file non contiene nessun post importabile.");
                    return;
                }

                setImportPreview({
                    type: isCsv ? 'csv' : 'json',
                    total: totalRecords,
                    valid: validCount,
                    invalid: invalidCount,
                    data: sanitizedPosts,
                    errors: importErrors
                });

            } catch (error) {
                console.error("Errore generico importazione:", error);
                alert("Si è verificato un errore imprevisto durante la lettura del file.");
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        if (isCsv) {
            reader.readAsText(file, 'windows-1252');
        } else {
            reader.readAsText(file);
        }
    }, [socialChannels, teamMembers]);

    const confirmImport = async () => {
        if (importPreview && importPreview.data) {
            await savePostsToStorage(importPreview.data);
            // Aggiorna anche l'indice di ricerca globale
            setGlobalSearchIndex(prev => [...prev, ...(importPreview.data || [])]);
            
            const importedCount = importPreview.valid;
            setImportPreview(null);
            
            alert(`Importazione completata! ${importedCount} post sono stati aggiunti al calendario.`);
        }
    };

    const cancelImport = () => {
        setImportPreview(null);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setIsAuthorized(null);
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        const channel = socialChannels.find(c => c.name === event.social);
        const channelColor = channel ? channel.color : '#6B7280'; 
        const style = {
            borderLeftColor: channelColor, 
        };
        return { style, className: 'custom-calendar-event' };
    }, [socialChannels]);

    // OPTIMIZED COMPONENTS DEFINITION WITH USEMEMO
    const { components } = useMemo(() => ({
        components: {
            event: ({ event }: EventProps<CalendarEvent>) => {
                const statusColor = STATUS_COLORS[event.status];
                const assignee = teamMembers.find(m => m.id === event.assignedTo);
                const channel = socialChannels.find(c => c.name === event.social);
                const channelColor = channel ? channel.color : '#9ca3af';

                return (
                    <div className="flex flex-col h-full justify-between overflow-hidden relative w-full">
                        <div className="flex flex-col gap-0.5 w-full">
                            <div className="flex items-center justify-between w-full">
                                <span 
                                    className="text-[9px] font-bold text-white px-1 py-0.5 rounded-sm shadow-sm truncate uppercase tracking-tight"
                                    style={{ backgroundColor: channelColor }}
                                >
                                    {event.social}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${statusColor} ring-1 ring-white dark:ring-gray-700 flex-shrink-0`}></div>
                            </div>
                            <div className="event-title font-semibold text-xs text-gray-800 dark:text-gray-100 leading-tight" title={event.title}>
                                {event.title || '(Senza titolo)'}
                            </div>
                        </div>
                        <div className="event-avatar mt-auto pt-1 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                            <span className="text-[10px] text-gray-500 capitalize truncate max-w-[70%]">{event.postType}</span>
                            {assignee && (
                                <div 
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm flex-shrink-0 border border-white dark:border-gray-800" 
                                    style={{ backgroundColor: assignee.color }}
                                    title={`Assegnato a: ${assignee.name}`}
                                >
                                    {assignee.name.substring(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
            agenda: {
                event: ({ event }: EventProps<CalendarEvent>) => {
                    const statusColor = STATUS_COLORS[event.status];
                    const assignee = teamMembers.find(m => m.id === event.assignedTo);
                    const channel = socialChannels.find(c => c.name === event.social);
                    const channelColor = channel ? channel.color : '#9ca3af';
                    
                    // Check if selected in selection mode
                    const isSelected = selectedPostIds.includes(event.id || '');

                    return (
                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full py-1 ${isSelectionMode && isSelected ? 'bg-blue-50 dark:bg-blue-900/20 rounded px-2 -mx-2' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-grow">
                                {/* Selection Checkbox */}
                                {isSelectionMode && (
                                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (event.id) handleCheckboxChange(event.id, e.target.checked);
                                            }}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                )}

                                <span 
                                    className="text-[10px] font-bold text-white px-2 py-1 rounded-md shadow-sm uppercase tracking-wide w-fit"
                                    style={{ backgroundColor: channelColor }}
                                >
                                    {event.social}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">{event.title || '(Senza titolo)'}</span>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize hidden sm:inline">{event.status}</span>
                                </div>
                                <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 text-xs border border-gray-200 dark:border-gray-600 capitalize">
                                    {event.postType}
                                </div>
                                {assignee ? (
                                    <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white dark:border-gray-800" 
                                        style={{ backgroundColor: assignee.color }}
                                        title={`Assegnato a: ${assignee.name}`}
                                    >
                                        {assignee.name.substring(0, 1).toUpperCase()}
                                    </div>
                                ) : (
                                    <div className="w-6 h-6"></div>
                                )}
                            </div>
                        </div>
                    );
                }
            },
            toolbar: (props: ToolbarProps) => <CustomToolbar {...props} />,
            week: {
                header: ({ date, localizer }: HeaderProps) => {
                    const dayStart = moment(date).startOf('day');
                    const dayEnd = moment(date).endOf('day');
                    const count = posts.filter(p => 
                        moment(p.date).isBetween(dayStart, dayEnd, undefined, '[]') && isPostVisible(p)
                    ).length;
                    return (
                        <div className="flex flex-col items-center justify-center py-1 w-full">
                            <span className="text-sm font-semibold capitalize">{localizer.format(date, 'ddd DD/MM')}</span>
                            <div className={`mt-2 w-full text-center py-1 rounded-md text-[11px] font-bold border transition-colors ${count > 0 ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-transparent text-gray-300 border-transparent dark:text-gray-600'}`}>
                                {count > 0 ? `${count} Post` : '-'}
                            </div>
                        </div>
                    );
                }
            },
            month: {
                dateHeader: ({ date, label }: DateHeaderProps) => {
                    const dayStart = moment(date).startOf('day');
                    const dayEnd = moment(date).endOf('day');
                    const postsForDay = posts.filter(p => 
                        moment(p.date).isBetween(dayStart, dayEnd, undefined, '[]') && isPostVisible(p)
                    );
                    const count = postsForDay.length;
                    return (
                        <div className="flex flex-col items-start p-1 w-full relative" style={{ minHeight: '30px' }}>
                            <span className="text-sm font-semibold mb-1">{label}</span>
                            {count > 0 && (
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        interactionBlockerRef.current = true;
                                        setTimeout(() => { interactionBlockerRef.current = false; }, 300);
                                        handleShowMore([], date); 
                                    }}
                                    className="w-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded shadow-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-center z-50 relative pointer-events-auto"
                                    style={{ marginTop: '2px' }}
                                >
                                    {count} Post
                                </button>
                            )}
                        </div>
                    );
                }
            }
        }
    }), [socialChannels, teamMembers, isSelectionMode, selectedPostIds, handleCheckboxChange, posts, isPostVisible, handleShowMore]);

    const handleDrillDown = useCallback((date: Date) => {
        setDate(date);
        setView(Views.DAY);
    }, []);

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300">Caricamento...</div>;
    }

    if (!user) {
        return <LoginScreen />;
    }

    if (isAuthorized === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accesso Google Negato</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        L'account Google <span className="font-bold text-gray-900 dark:text-white">{user.email}</span> non è nella whitelist.
                    </p>
                    <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg">Esci e cambia account</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
            {isLoadingReportData && (
                <div className="fixed inset-0 bg-white/50 dark:bg-black/50 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 font-semibold text-blue-600 dark:text-blue-400">Caricamento dati completi...</p>
                </div>
            )}
            
            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-2 md:p-4 h-full overflow-hidden">
                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Loggato come: <span className="font-semibold text-blue-600 dark:text-blue-400">{user.email}</span></div>
                    <button onClick={handleLogout} className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">Esci</button>
                </div>
                
                <div className="flex-shrink-0 space-y-2 mb-2">
                    <CalendarHeader 
                        onAddPost={() => handleSelectSlot({ start: new Date() })}
                        onShowReports={handleShowReports}
                        onShowChannels={() => setIsChannelsModalOpen(true)}
                        onShowTeam={() => setIsTeamModalOpen(true)}
                        onExportJson={handleExportJson}
                        onExportCsv={handleExportCsv}
                        onImport={handleImportFileSelect}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        fileInputRef={fileInputRef}
                        channels={socialChannels}
                        activeFilters={activeChannelFilters}
                        onToggleChannel={toggleChannelFilter}
                        notifications={notifications}
                        onNotificationClick={handleNotificationClick}
                        onShowChangelog={() => setIsChangelogModalOpen(true)}
                        activeStatusFilters={activeStatusFilters}
                        onToggleStatus={toggleStatusFilter}
                        statusCounts={statusCounts}
                        onShowFollowers={() => setIsFollowersModalOpen(true)}
                        ghostChannels={ghostChannels}
                        // NUOVE PROPS PER RICERCA GLOBALE
                        allPosts={globalSearchIndex}
                        onSearchResultSelect={handleSearchResultSelect}
                        onSearchSubmit={handleSearchSubmit} // PASSATA FUNZIONE SUBMIT
                    />
                    
                    {/* AGENDA BULK ACTIONS TOOLBAR (Visibile solo in view Agenda) */}
                    {view === Views.AGENDA && !isSearchMode && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg flex items-center justify-between animate-fadeIn">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Gestione Agenda
                                </h3>
                                <div className="h-6 w-px bg-blue-200 dark:bg-blue-700 mx-1"></div>
                                <button
                                    onClick={handleToggleSelectionMode}
                                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                                        isSelectionMode 
                                        ? 'bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-100' 
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    {isSelectionMode ? 'Annulla Selezione' : 'Seleziona Post'}
                                </button>
                            </div>
                            
                            {isSelectionMode && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {selectedPostIds.length} selezionati
                                    </span>
                                    <button
                                        onClick={handleBulkDeleteClick}
                                        disabled={selectedPostIds.length === 0}
                                        className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Elimina ({selectedPostIds.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <StatusLegend />
                </div>

                <div className="flex-grow min-h-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg relative p-2 md:p-4 overflow-hidden flex flex-col">
                    {/* RENDER CONDIZIONALE: CALENDARIO O RISULTATI RICERCA */}
                    {isSearchMode ? (
                        <div className="flex flex-col h-full animate-fadeIn">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    Risultati Ricerca: "{searchTerm}"
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">{searchResults.length}</span>
                                </h2>
                                <button 
                                    onClick={handleBackToCalendar}
                                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                                >
                                    Chiudi ricerca
                                </button>
                            </div>
                            
                            <div className="overflow-y-auto flex-grow custom-scrollbar space-y-3 pr-2">
                                {searchResults.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p>Nessun post trovato per "{searchTerm}"</p>
                                    </div>
                                ) : (
                                    searchResults.map(post => {
                                        const statusColor = STATUS_COLORS[post.status];
                                        const assignee = teamMembers.find(m => m.id === post.assignedTo);
                                        const channel = socialChannels.find(c => c.name === post.social);
                                        const channelColor = channel ? channel.color : '#9ca3af';

                                        return (
                                            <div 
                                                key={post.id} 
                                                onClick={() => { handleSearchResultSelect(post); }}
                                                className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3 flex-grow min-w-0">
                                                        <div className="flex flex-col items-center min-w-[50px] pt-1">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{moment(post.date).format('MMM')}</span>
                                                            <span className="text-xl font-bold text-gray-700 dark:text-gray-200 leading-none">{moment(post.date).format('DD')}</span>
                                                            <span className="text-[10px] text-gray-400">{moment(post.date).format('YYYY')}</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span 
                                                                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm uppercase tracking-wide"
                                                                    style={{ backgroundColor: channelColor }}
                                                                >
                                                                    {post.social}
                                                                </span>
                                                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                                                    {post.title}
                                                                </h3>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                                {post.notes || 'Nessuna nota...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0 pl-14 sm:pl-0">
                                                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase text-white ${statusColor}`}>
                                                            {post.status}
                                                        </div>
                                                        {assignee && (
                                                            <div 
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                                                                style={{ backgroundColor: assignee.color }}
                                                                title={`Assegnato a: ${assignee.name}`}
                                                            >
                                                                {assignee.name.substring(0, 1).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <Calendar
                            style={{ height: '100%' }}
                            localizer={localizer} culture='it' events={filteredEvents} startAccessor="start" endAccessor="end" view={view} onView={setView} date={date} onNavigate={setDate} views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]} selectable scrollToTime={defaultScrollTime} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} eventPropGetter={eventPropGetter} messages={calendarMessages} formats={calendarFormats} popup={false} onDrillDown={handleDrillDown} onShowMore={handleShowMore} dayLayoutAlgorithm="no-overlap" 
                            components={components}
                        />
                    )}
                </div>
            </div>
            
            <Suspense fallback={null}>
                {isPostModalOpen && selectedEvent && (
                    <PostModal isOpen={isPostModalOpen} post={selectedEvent} socialChannels={socialChannels} teamMembers={teamMembers} onClose={closePostModal} onSave={handleSavePost} onDelete={handleDeletePost} />
                )}
                {isReportsModalOpen && (
                    <ReportsModal isOpen={isReportsModalOpen} onClose={() => setIsReportsModalOpen(false)} posts={reportPosts} channels={socialChannels} teamMembers={teamMembers} />
                )}
                {isChannelsModalOpen && (
                    <SocialChannelsModal isOpen={isChannelsModalOpen} onClose={() => setIsChannelsModalOpen(false)} channels={socialChannels} posts={posts} onSave={handleSaveChannels} />
                )}
                {isTeamModalOpen && (
                    <TeamMembersModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} teamMembers={teamMembers} posts={posts} onSave={handleSaveTeam} />
                )}
                {isChangelogModalOpen && (
                    <ChangelogModal isOpen={isChangelogModalOpen} onClose={() => setIsChangelogModalOpen(false)} />
                )}
                {/* MODALE FOLLOWERS */}
                {isFollowersModalOpen && (
                    <FollowersModal isOpen={isFollowersModalOpen} onClose={() => setIsFollowersModalOpen(false)} channels={socialChannels} />
                )}
                {dayModalData.isOpen && (
                    <DayDetailsModal isOpen={dayModalData.isOpen} onClose={() => setDayModalData(prev => ({ ...prev, isOpen: false }))} date={dayModalData.date} posts={dayModalData.posts} teamMembers={teamMembers} channels={socialChannels} onEditPost={(post) => { setSelectedEvent(post); setIsPostModalOpen(true); }} />
                )}
            </Suspense>
            {importPreview && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-xl text-center flex flex-col max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Anteprima Importazione</h3>
                        
                        <div className="flex justify-around items-center my-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-green-600 dark:text-green-400">{importPreview.valid}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Validi</span>
                            </div>
                            {importPreview.errors && importPreview.errors.length > 0 && (
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-red-600 dark:text-red-400">{importPreview.errors.length}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Errori</span>
                                </div>
                            )}
                        </div>

                        {importPreview.errors && importPreview.errors.length > 0 && (
                            <div className="mb-4 text-left overflow-hidden flex flex-col">
                                <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Errori rilevati ({importPreview.errors.length})
                                </h4>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 overflow-y-auto max-h-40 text-xs">
                                    {importPreview.errors.map((err, idx) => (
                                        <div key={idx} className="mb-2 last:mb-0 pb-2 border-b border-red-100 dark:border-red-800 last:border-0">
                                            <span className="font-bold text-red-700 dark:text-red-300">Riga {err.row}: </span>
                                            <span className="text-red-600 dark:text-red-200">{err.message}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 italic">I record con errori verranno ignorati. Puoi correggere il file e riprovare, oppure procedere importando solo quelli validi.</p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button onClick={cancelImport} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-800 dark:text-white transition-colors hover:bg-gray-300 dark:hover:bg-gray-500">
                                Annulla
                            </button>
                            <button 
                                onClick={confirmImport} 
                                disabled={importPreview.valid === 0}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold transition-colors shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Importa Validi ({importPreview.valid})
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* BULK DELETE CONFIRMATION MODAL */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm text-center transform scale-100 transition-transform">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Elimina {selectedPostIds.length} Post</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Sei sicuro di voler eliminare definitivamente i post selezionati? Questa azione non può essere annullata.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsBulkDeleteModalOpen(false)} 
                                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-800 dark:text-white transition-colors font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                Annulla
                            </button>
                            <button 
                                onClick={performBulkDelete} 
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:bg-red-700"
                            >
                                Sì, Elimina
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
