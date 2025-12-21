
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
import { exportPostsToJson, exportPostsToCsv, parseCsvToPosts } from './utils/fileHandlers';
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
    const [reportPosts, setReportPosts] = useState<Post[]>([]); 
    const [isLoadingReportData, setIsLoadingReportData] = useState(false);

    const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeChannelFilters, setActiveChannelFilters] = useState<string[]>([]);
    
    const [view, setView] = useState(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const [selectedEvent, setSelectedEvent] = useState<Partial<Post> | null>(null);
    
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
    const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
    
    const [dayModalData, setDayModalData] = useState<{ isOpen: boolean, date: Date | null, posts: Post[] }>({
        isOpen: false,
        date: null,
        posts: []
    });

    const [importPreview, setImportPreview] = useState<{
        type: 'json' | 'csv';
        total: number;
        valid: number;
        invalid: number;
        data: Post[];
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const defaultScrollTime = useMemo(() => new Date(1970, 1, 1, 9, 0, 0), []);

    const calendarFormats = useMemo<Formats>(() => ({
        monthHeaderFormat: (date, culture, local) => local.format(date, 'MMMM YYYY', culture),
        weekdayFormat: (date, culture, local) => local.format(date, 'dddd', culture),
        dayHeaderFormat: (date, culture, local) => local.format(date, 'dddd DD/MM/YYYY', culture),
        dayRangeHeaderFormat: ({ start, end }, culture, local) =>
            local.format(start, 'DD MMM', culture) + ' - ' + local.format(end, 'DD MMM YYYY', culture),
        agendaDateFormat: (date, culture, local) => local.format(date, 'ddd DD MMM', culture),
    }), []); 

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

    // EFFETTO MIGRAZIONE DATI: Eseguito una sola volta quando l'utente è autorizzato
    useEffect(() => {
        if (isAuthorized) {
            migrateCollaborationData();
        }
    }, [isAuthorized]);

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

    const handleShowReports = async () => {
        setIsLoadingReportData(true);
        const oneYearAgo = moment().subtract(1, 'year').format('YYYY-MM-DD');
        const data = await fetchAllPosts(oneYearAgo);
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

    const filteredEvents = useMemo(() => {
        let result = events;
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(event => 
                event.title.toLowerCase().includes(lowerTerm) || 
                (event.notes && event.notes.toLowerCase().includes(lowerTerm))
            );
        }
        if (activeChannelFilters.length > 0) {
            result = result.filter(event => activeChannelFilters.includes(event.social));
        }
        return result;
    }, [events, searchTerm, activeChannelFilters]);
    
    const toggleChannelFilter = useCallback((channelName: string) => {
        setActiveChannelFilters(prev => {
            if (prev.includes(channelName)) {
                return prev.filter(c => c !== channelName);
            } else {
                return [...prev, channelName];
            }
        });
    }, []);

    const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
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
    }, [socialChannels]);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        const post = posts.find(p => p.id === event.id);
        if (post) {
            setSelectedEvent(post);
        }
        setIsPostModalOpen(true);
    }, [posts]);

    const isPostVisible = useCallback((post: Post) => {
        if (activeChannelFilters.length > 0 && !activeChannelFilters.includes(post.social)) {
            return false;
        }
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            const matchesSearch = 
                post.title.toLowerCase().includes(lowerTerm) || 
                (post.notes && post.notes.toLowerCase().includes(lowerTerm));
            if (!matchesSearch) return false;
        }
        return true;
    }, [activeChannelFilters, searchTerm]);

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
        closePostModal();
    }, [closePostModal, posts]);
    
    const handleDeletePost = useCallback(async (id: string) => {
        if (!id) return;
        await deletePost(id);
        closePostModal();
    }, [closePostModal]);

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
                let validCount = 0;
                let invalidCount = 0;
                let totalRecords = 0;

                if (isCsv) {
                    const parsed = parseCsvToPosts(content, teamMembers);
                    totalRecords = parsed.length;
                    sanitizedPosts = parsed.map(p => {
                        const { id, ...rest } = p;
                        return rest as Post;
                    });
                    validCount = sanitizedPosts.length;
                } else {
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
                if (validCount === 0) {
                    alert("Il file non contiene nessun post valido da importare.");
                    return;
                }
                setImportPreview({
                    type: isCsv ? 'csv' : 'json',
                    total: totalRecords,
                    valid: validCount,
                    invalid: invalidCount,
                    data: sanitizedPosts
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
            setImportPreview(null);
            if (importPreview.type === 'csv') {
                alert(`Importazione completata! ${importPreview.valid} post sono stati aggiunti al calendario.`);
            }
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

    const CustomEvent: React.FC<EventProps<CalendarEvent>> = ({ event }) => {
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
    };

    const CustomAgendaEvent: React.FC<EventProps<CalendarEvent>> = ({ event }) => {
        const statusColor = STATUS_COLORS[event.status];
        const assignee = teamMembers.find(m => m.id === event.assignedTo);
        const channel = socialChannels.find(c => c.name === event.social);
        const channelColor = channel ? channel.color : '#9ca3af';

        return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full py-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-grow">
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
    };
    
    const CustomWeekHeader: React.FC<HeaderProps> = ({ date, localizer }) => {
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
    };
    
    const CustomMonthDateHeader: React.FC<DateHeaderProps> = ({ date, label }) => {
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
                        onClick={(e) => { e.stopPropagation(); handleShowMore([], date); }}
                        className="w-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded shadow-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-center z-50 relative pointer-events-auto"
                        style={{ marginTop: '2px' }}
                    >
                        {count} Post
                    </button>
                )}
            </div>
        );
    };

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
        <div className="p-4 md:p-8 font-sans text-gray-800 dark:text-gray-200">
            {isLoadingReportData && (
                <div className="fixed inset-0 bg-white/50 dark:bg-black/50 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 font-semibold text-blue-600 dark:text-blue-400">Caricamento dati completi...</p>
                </div>
            )}
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Loggato come: <span className="font-semibold text-blue-600 dark:text-blue-400">{user.email}</span></div>
                    <button onClick={handleLogout} className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">Esci</button>
                </div>
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
                />
                <StatusLegend />
                <div className="bg-white dark:bg-gray-800 p-4 pb-10 rounded-lg shadow-lg" style={{ height: 'calc(100vh - 240px)' }}>
                    <Calendar
                        localizer={localizer} culture='it' events={filteredEvents} startAccessor="start" endAccessor="end" view={view} onView={setView} date={date} onNavigate={setDate} views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]} selectable scrollToTime={defaultScrollTime} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent} eventPropGetter={eventPropGetter} messages={calendarMessages} formats={calendarFormats} popup={false} onDrillDown={handleDrillDown} onShowMore={handleShowMore} dayLayoutAlgorithm="no-overlap" 
                        components={{
                            event: CustomEvent,
                            agenda: { event: CustomAgendaEvent },
                            toolbar: (props: ToolbarProps) => <CustomToolbar {...props} />,
                            week: { header: CustomWeekHeader },
                            month: { dateHeader: CustomMonthDateHeader }
                        }}
                    />
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
                {dayModalData.isOpen && (
                    <DayDetailsModal isOpen={dayModalData.isOpen} onClose={() => setDayModalData(prev => ({ ...prev, isOpen: false }))} date={dayModalData.date} posts={dayModalData.posts} teamMembers={teamMembers} channels={socialChannels} onEditPost={(post) => { setSelectedEvent(post); setIsPostModalOpen(true); }} />
                )}
            </Suspense>
            {importPreview && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md text-center">
                        <h3 className="text-xl font-bold mb-2">Conferma Importazione</h3>
                        <p className="text-sm text-gray-500 mb-6">Record pronti: {importPreview.valid}</p>
                        <div className="flex gap-3">
                            <button onClick={cancelImport} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-800 dark:text-white transition-colors">Annulla</button>
                            <button onClick={confirmImport} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold transition-colors shadow-lg">Conferma</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
