
import { Post, SocialChannel, PostVersion, TeamMember, PostStatus, PostType, FollowerStat, Campaign } from '../types';
import { db } from '../firebaseConfig';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    writeBatch,
    setDoc,
    where,
    orderBy,
    getDocs
} from 'firebase/firestore';

const POSTS_COLLECTION = 'posts';
const CHANNELS_COLLECTION = 'channels';
const TEAM_COLLECTION = 'team_members';
const STATS_COLLECTION = 'follower_stats';
const CAMPAIGNS_COLLECTION = 'campaigns';

// --- HELPERS ---

const handleError = (action: string, error: any) => {
    console.error(`Errore durante ${action}:`, error);
    alert(`Si è verificato un errore durante l'operazione: ${action}. Controlla la console o la connessione.`);
};

// --- MIGRATION LOGIC ---

/**
 * Funzione per migrare i dati: sposta "Collaborazione" da tipo a stato.
 * Viene chiamata all'avvio se necessario.
 */
export const migrateCollaborationData = async () => {
    try {
        // Cerchiamo tutti i post che hanno ancora il postType impostato come "collaborazione" 
        // (che ora non esiste più nell'enum tecnico ma potrebbe essere nel DB)
        const q = query(collection(db, POSTS_COLLECTION), where('postType', '==', 'collaborazione'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        console.log(`Migrazione in corso: rilevati ${snapshot.size} post da aggiornare...`);
        const batch = writeBatch(db);
        
        snapshot.forEach((document) => {
            const postRef = doc(db, POSTS_COLLECTION, document.id);
            batch.update(postRef, {
                status: PostStatus.Collaboration,
                postType: PostType.Post // Resettiamo a tipo generico
            });
        });

        await batch.commit();
        console.log("Migrazione completata con successo.");
    } catch (e) {
        console.error("Errore durante la migrazione dei dati:", e);
    }
};

// --- POSTS MANAGEMENT ---

export const subscribeToPosts = (
    startDate: string, 
    endDate: string, 
    callback: (posts: Post[]) => void
) => {
    const q = query(
        collection(db, POSTS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...(doc.data() as any) } as Post);
        });
        callback(posts);
    }, (error) => {
        console.error("Errore di sottoscrizione ai post:", error);
    });

    return unsubscribe;
};

export const fetchAllPosts = async (startDate?: string): Promise<Post[]> => {
    try {
        let q;
        if (startDate) {
             q = query(collection(db, POSTS_COLLECTION), where('date', '>=', startDate));
        } else {
             q = query(collection(db, POSTS_COLLECTION));
        }

        const snapshot = await getDocs(q);
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...(doc.data() as any) } as Post);
        });
        return posts;
    } catch (e) {
        handleError('caricamento completo post', e);
        return [];
    }
};

// NUOVA FUNZIONE OTTIMIZZATA PER LE CAMPAGNE
export const fetchPostsByCampaign = async (campaignId: string): Promise<Post[]> => {
    try {
        const q = query(collection(db, POSTS_COLLECTION), where('campaignId', '==', campaignId));
        const snapshot = await getDocs(q);
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...(doc.data() as any) } as Post);
        });
        return posts;
    } catch (e) {
        handleError('caricamento post campagna', e);
        return [];
    }
};

export const addPost = async (post: Omit<Post, 'id'>): Promise<Post> => {
    try {
        const sanitizedPost = Object.fromEntries(
            Object.entries(post).filter(([key, value]) => key !== 'id' && value !== undefined)
        );

        const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
            ...sanitizedPost,
            history: [] 
        });
        return { id: docRef.id, ...post } as Post;
    } catch (e) {
        handleError('aggiunta post', e);
        throw e;
    }
};

export const updatePost = async (id: string, updatedData: Partial<Post>): Promise<void> => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, id);
        const sanitizedData = Object.fromEntries(
            Object.entries(updatedData).filter(([_, value]) => value !== undefined)
        );
        await updateDoc(postRef, sanitizedData);
    } catch (e) {
        handleError('aggiornamento post', e);
        throw e;
    }
};

export const savePostWithHistory = async (id: string, currentPost: Post, changes: Partial<Post>): Promise<void> => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, id);
        const { history, ...postDataWithoutHistory } = currentPost;
        
        const versionSnapshot: PostVersion = {
            timestamp: new Date().toISOString(),
            data: postDataWithoutHistory as Omit<Post, 'history'>
        };

        const newHistory = [...(history || []), versionSnapshot];
        if (newHistory.length > 10) newHistory.shift();

        const sanitizedChanges = Object.fromEntries(
            Object.entries(changes).filter(([_, value]) => value !== undefined)
        );

        await updateDoc(postRef, {
            ...sanitizedChanges,
            history: newHistory
        });
    } catch (e) {
        handleError('salvataggio cronologia', e);
        throw e;
    }
};

export const deletePost = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, POSTS_COLLECTION, id));
    } catch (e) {
        handleError('eliminazione post', e);
        throw e;
    }
};

export const deletePostsBulk = async (ids: string[]): Promise<void> => {
    console.log(`Avvio eliminazione massiva di ${ids.length} documenti...`);
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const postRef = doc(db, POSTS_COLLECTION, id);
            batch.delete(postRef);
        });
        await batch.commit();
        console.log('Eliminazione massiva completata.');
    } catch (e) {
        handleError('eliminazione massiva post', e);
        throw e;
    }
};

export const savePostsToStorage = async (newPosts: Post[]) => {
    try {
        const chunks = [];
        for (let i = 0; i < newPosts.length; i += 400) {
            chunks.push(newPosts.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const newBatch = writeBatch(db);
            chunk.forEach(post => {
                const postRef = post.id 
                    ? doc(db, POSTS_COLLECTION, post.id)
                    : doc(collection(db, POSTS_COLLECTION));
                    
                const { id, ...data } = post;
                const sanitizedData = Object.fromEntries(
                    Object.entries(data).filter(([_, value]) => value !== undefined)
                );
                newBatch.set(postRef, sanitizedData);
            });
            await newBatch.commit();
        }
        
        alert('Importazione completata con successo nel cloud!');
    } catch (e) {
        handleError('importazione massiva', e);
        throw e;
    }
};

// --- CHANNELS MANAGEMENT ---

const defaultChannels: SocialChannel[] = [
    { id: 'fb', name: 'Facebook', color: '#1877F2' },
    { id: 'ig', name: 'Instagram', color: '#E4405F' },
    { id: 'li', name: 'LinkedIn', color: '#0A66C2' },
    { id: 'x', name: 'X', color: '#000000' },
    { id: 'th', name: 'Threads', color: '#636363' },
    { id: 'yt', name: 'YouTube', color: '#FF0000' },
    { id: 'wa', name: 'WhatsApp', color: '#25D366' },
    { id: 'tg', name: 'Telegram', color: '#2AABEE' },
];

export const subscribeToChannels = (callback: (channels: SocialChannel[]) => void) => {
    const q = query(collection(db, CHANNELS_COLLECTION), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        let channels: SocialChannel[] = [];
        snapshot.forEach((doc) => {
            channels.push({ id: doc.id, ...(doc.data() as any) } as SocialChannel);
        });

        if (channels.length === 0) {
            await initializeDefaultChannels();
        } else {
            callback(channels);
        }
    }, (error) => {
        console.error("Errore sottoscrizione canali:", error);
    });

    return unsubscribe;
};

const initializeDefaultChannels = async () => {
    const batch = writeBatch(db);
    defaultChannels.forEach(channel => {
        const docRef = doc(db, CHANNELS_COLLECTION, channel.id);
        batch.set(docRef, { name: channel.name, color: channel.color });
    });
    await batch.commit();
};

export const saveSocialChannels = async (channels: SocialChannel[]) => {
    const batch = writeBatch(db);
    channels.forEach(c => {
        const docRef = doc(db, CHANNELS_COLLECTION, c.id);
        batch.set(docRef, { name: c.name, color: c.color }, { merge: true });
    });
    await batch.commit();
};

export const deleteChannelFromDb = async (id: string) => {
    try {
        await deleteDoc(doc(db, CHANNELS_COLLECTION, id));
    } catch (e) {
        handleError('eliminazione canale', e);
        throw e;
    }
};

// --- TEAM MANAGEMENT ---

export const subscribeToTeam = (callback: (members: TeamMember[]) => void) => {
    const q = query(collection(db, TEAM_COLLECTION), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let members: TeamMember[] = [];
        snapshot.forEach((doc) => {
            members.push({ id: doc.id, ...(doc.data() as any) } as TeamMember);
        });
        callback(members);
    }, (error) => {
        console.error("Errore sottoscrizione team:", error);
    });

    return unsubscribe;
};

export const saveTeamMembers = async (members: TeamMember[]) => {
    const batch = writeBatch(db);
    members.forEach(m => {
        const docRef = doc(db, TEAM_COLLECTION, m.id);
        batch.set(docRef, { name: m.name, color: m.color }, { merge: true });
    });
    await batch.commit();
};

export const deleteTeamMemberFromDb = async (id: string) => {
    try {
        await deleteDoc(doc(db, TEAM_COLLECTION, id));
    } catch (e) {
        handleError('eliminazione membro team', e);
        throw e;
    }
};

// --- FOLLOWERS STATS MANAGEMENT ---

export const subscribeToFollowerStats = (callback: (stats: FollowerStat[]) => void) => {
    const q = query(collection(db, STATS_COLLECTION), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const stats: FollowerStat[] = [];
        snapshot.forEach((doc) => {
            stats.push({ id: doc.id, ...(doc.data() as any) } as FollowerStat);
        });
        callback(stats);
    }, (error) => {
        console.error("Errore sottoscrizione stats:", error);
    });

    return unsubscribe;
};

export const addFollowerStat = async (stat: FollowerStat): Promise<void> => {
    try {
        const { id, ...data } = stat;
        // Controlla se esiste già un documento per questa data
        const q = query(collection(db, STATS_COLLECTION), where('date', '==', stat.date));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Aggiorna esistente con merge
            const existingDoc = snapshot.docs[0];
            const existingData = existingDoc.data() as FollowerStat;
            
            // Uniamo i canali: i nuovi sovrascrivono i vecchi solo se presenti
            const mergedChannels = {
                ...(existingData.channels || {}),
                ...stat.channels
            };
            
            // Ricalcoliamo il totale basato sui dati uniti
            const EXCLUDED_FROM_TOTAL = ['WhatsApp', 'Telegram'];
            const newTotal = Object.entries(mergedChannels).reduce((acc, [name, val]) => {
                if (EXCLUDED_FROM_TOTAL.includes(name)) return acc;
                return acc + (Number(val) || 0);
            }, 0);

            const docRef = doc(db, STATS_COLLECTION, existingDoc.id);
            await updateDoc(docRef, {
                channels: mergedChannels,
                total: newTotal
            });
        } else {
            // Crea nuova registrazione
            await addDoc(collection(db, STATS_COLLECTION), data);
        }
    } catch (e) {
        handleError('salvataggio statistiche follower', e);
        throw e;
    }
};

export const deleteFollowerStat = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, STATS_COLLECTION, id));
    } catch (e) {
        handleError('eliminazione statistica', e);
        throw e;
    }
};

// --- CAMPAIGNS MANAGEMENT ---

export const subscribeToCampaigns = (callback: (campaigns: Campaign[]) => void) => {
    const q = query(collection(db, CAMPAIGNS_COLLECTION), orderBy('startDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const campaigns: Campaign[] = [];
        snapshot.forEach((doc) => {
            campaigns.push({ id: doc.id, ...(doc.data() as any) } as Campaign);
        });
        callback(campaigns);
    }, (error) => {
        console.error("Errore sottoscrizione campagne:", error);
    });

    return unsubscribe;
};

export const addCampaign = async (campaign: Omit<Campaign, 'id'>): Promise<void> => {
    try {
        await addDoc(collection(db, CAMPAIGNS_COLLECTION), {
            ...campaign,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        handleError('creazione campagna', e);
        throw e;
    }
};

export const deleteCampaign = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, id));
    } catch (e) {
        handleError('eliminazione campagna', e);
        throw e;
    }
};

// Aggiornamento massivo dello stato "hiddenFromCalendar" per i post di una campagna
export const syncCampaignPosts = async (campaignId: string, hidden: boolean) => {
    try {
        const q = query(collection(db, POSTS_COLLECTION), where('campaignId', '==', campaignId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.forEach((document) => {
            const postRef = doc(db, POSTS_COLLECTION, document.id);
            batch.update(postRef, { hiddenFromCalendar: hidden });
        });

        await batch.commit();
    } catch (e) {
        handleError('sincronizzazione post campagna', e);
        throw e;
    }
};
