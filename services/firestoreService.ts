
import { Post, SocialChannel, PostVersion, TeamMember } from '../types';
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
    getDocs
} from 'firebase/firestore';

const POSTS_COLLECTION = 'posts';
const CHANNELS_COLLECTION = 'channels';
const TEAM_COLLECTION = 'team_members';

// --- HELPERS ---

// Funzione di utilità per convertire gli errori in qualcosa di leggibile in console
const handleError = (action: string, error: any) => {
    console.error(`Errore durante ${action}:`, error);
    alert(`Si è verificato un errore durante l'operazione: ${action}. Controlla la console o la connessione.`);
};

// --- POSTS MANAGEMENT ---

// Sottoscrizione in tempo reale ai Post
export const subscribeToPosts = (callback: (posts: Post[]) => void) => {
    const q = query(collection(db, POSTS_COLLECTION));
    
    // onSnapshot ascolta i cambiamenti nel DB in tempo reale
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() } as Post);
        });
        callback(posts);
    }, (error) => {
        console.error("Errore di sottoscrizione ai post:", error);
    });

    return unsubscribe;
};

// Aggiungi un nuovo post
export const addPost = async (post: Omit<Post, 'id'>): Promise<Post> => {
    try {
        // Sanificazione: Rimuovi esplicitamente 'id' se presente (anche se undefined) per evitare errori Firestore
        // e rimuovi eventuali campi undefined che potrebbero rompere addDoc
        const sanitizedPost = Object.fromEntries(
            Object.entries(post).filter(([key, value]) => key !== 'id' && value !== undefined)
        );

        const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
            ...sanitizedPost,
            history: [] // Inizializza la cronologia vuota
        });
        return { id: docRef.id, ...post } as Post;
    } catch (e) {
        handleError('aggiunta post', e);
        throw e;
    }
};

// Aggiorna un post esistente
export const updatePost = async (id: string, updatedData: Partial<Post>): Promise<void> => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, id);
        
        // Sanitize undefined values before update
        const sanitizedData = Object.fromEntries(
            Object.entries(updatedData).filter(([_, value]) => value !== undefined)
        );

        await updateDoc(postRef, sanitizedData);
    } catch (e) {
        handleError('aggiornamento post', e);
        throw e;
    }
};

// Salva post con cronologia
export const savePostWithHistory = async (id: string, currentPost: Post, changes: Partial<Post>): Promise<void> => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, id);
        
        // Crea snapshot per la cronologia
        // Rimuoviamo 'history' dai dati salvati nella cronologia per evitare nidificazione infinita
        const { history, ...postDataWithoutHistory } = currentPost;
        
        const versionSnapshot: PostVersion = {
            timestamp: new Date().toISOString(),
            data: postDataWithoutHistory as Omit<Post, 'history'>
        };

        const newHistory = [...(history || []), versionSnapshot];
        
        // Sanitize changes
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

// Elimina un post
export const deletePost = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, POSTS_COLLECTION, id));
    } catch (e) {
        handleError('eliminazione post', e);
        throw e;
    }
};

// Importazione massiva (usata per il restore da file JSON)
export const savePostsToStorage = async (newPosts: Post[]) => {
    try {
        const batch = writeBatch(db);
        
        // Nota: Firestore ha un limite di 500 operazioni per batch.
        // Per semplicità qui assumiamo che l'import sia < 500 post.
        // Se l'import è grande, bisognerebbe spezzarlo in più batch.
        
        newPosts.forEach(post => {
            // Se il post ha un ID, usiamo quello (per sovrascrivere o mantenere riferimenti)
            // Altrimenti ne generiamo uno nuovo
            const postRef = post.id 
                ? doc(db, POSTS_COLLECTION, post.id)
                : doc(collection(db, POSTS_COLLECTION));
                
            const { id, ...data } = post; // Separiamo l'id dai dati
            
            // Sanitize data
            const sanitizedData = Object.fromEntries(
                Object.entries(data).filter(([_, value]) => value !== undefined)
            );

            batch.set(postRef, sanitizedData);
        });

        await batch.commit();
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
    const q = query(collection(db, CHANNELS_COLLECTION));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        let channels: SocialChannel[] = [];
        snapshot.forEach((doc) => {
            channels.push({ id: doc.id, ...doc.data() } as SocialChannel);
        });

        // Se non ci sono canali nel DB (primo avvio), crea quelli di default
        if (channels.length === 0) {
            console.log("Nessun canale trovato. Inizializzazione canali di default...");
            await initializeDefaultChannels();
            // Non serve richiamare callback qui, il prossimo snapshot lo farà
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
    const q = query(collection(db, TEAM_COLLECTION));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let members: TeamMember[] = [];
        snapshot.forEach((doc) => {
            members.push({ id: doc.id, ...doc.data() } as TeamMember);
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
        // Se è un nuovo membro senza ID valido generato da noi nel modal, Firestore ne creerà uno
        // Ma qui assumiamo che il modal generi un ID temporaneo se nuovo
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