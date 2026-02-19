
import React, { useState, useEffect, useRef } from 'react';
import { Post, PostStatus, PostType, SocialChannel, PostVersion, TeamMember } from '../types';
import { POST_STATUSES, POST_TYPES } from '../constants';
import moment from 'moment';

interface PostModalProps {
  isOpen: boolean;
  post: Partial<Post>;
  socialChannels: SocialChannel[];
  teamMembers?: TeamMember[];
  onClose: () => void;
  onSave: (post: Post) => void;
  onDelete: (id: string) => void;
  
  // Campagne context
  forcedCampaignId?: string;
  defaultHidden?: boolean;
}

const PostModal: React.FC<PostModalProps> = ({ 
    isOpen, 
    post, 
    socialChannels, 
    teamMembers = [], 
    onClose, 
    onSave, 
    onDelete,
    forcedCampaignId,
    defaultHidden = false
}) => {
  const [formData, setFormData] = useState<Partial<Post>>(post);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  // Edit vs Preview Mode for Notes
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('edit');
  
  // Ref per la textarea per gestire cursore e selezione
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Validation state
  const [urlErrors, setUrlErrors] = useState({ external: '', creativity: '' });

  useEffect(() => {
    // Merge post data with campaign defaults if creating new
    const initialData = { ...post };
    if (!post.id && forcedCampaignId) {
        initialData.campaignId = forcedCampaignId;
        // Solo se è nuovo applichiamo il defaultHidden, altrimenti rispettiamo quello che c'è
        if (initialData.hiddenFromCalendar === undefined) {
            initialData.hiddenFromCalendar = defaultHidden;
        }
    }
    
    setFormData(initialData);
    setShowDeleteConfirm(false);
    setShowHistory(false);
    // Se il post ha un ID (esiste già), mostra l'anteprima di default.
    // Se è un nuovo post, mostra la modalità di scrittura.
    setNoteMode(post.id ? 'preview' : 'edit');
    setUrlErrors({ external: '', creativity: '' });
  }, [post, forcedCampaignId, defaultHidden]);

  const validateUrl = (url?: string) => {
      if (!url) return '';
      // Controllo molto semplice: deve iniziare con http o https o www
      if (url.match(/^(http|https):\/\//) || url.startsWith('www.')) return '';
      return 'Inserisci un URL valido (es. https://...)';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const updated = { ...prev, [name]: value };

        // AUTOMAZIONE: Logica intelligente per il tipo di contenuto in base al canale
        if (name === 'social') {
            if (value === 'YouTube') {
                updated.postType = PostType.Video;
            } else if (value === 'Telegram' || value === 'WhatsApp') {
                updated.postType = PostType.Update; // 'aggiornamento'
            }
        }

        // AUTOMAZIONE: Se seleziono "Short", il canale diventa YouTube
        if (name === 'postType') {
            if (value === PostType.Short) {
                updated.social = 'YouTube';
            }
        }

        return updated;
    });

    // Validazione Real-time per i link
    if (name === 'externalLink') {
        setUrlErrors(prev => ({ ...prev, external: validateUrl(value) }));
    }
    if (name === 'creativityLink') {
        setUrlErrors(prev => ({ ...prev, creativity: validateUrl(value) }));
    }
  };

  const handleToggleHidden = () => {
      setFormData(prev => ({ ...prev, hiddenFromCalendar: !prev.hiddenFromCalendar }));
  };

  const handleCopyTitle = async () => {
    if (formData.title) {
        try {
            await navigator.clipboard.writeText(formData.title);
            setShowCopyFeedback(true);
            setTimeout(() => setShowCopyFeedback(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
  };

  const handleInsertText = (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
          // Fallback se il ref non è pronto
          setFormData(prev => ({
              ...prev,
              notes: (prev.notes || '') + text
          }));
          return;
      }

      // Inserisce il testo alla posizione del cursore
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = formData.notes || '';
      
      const newText = currentText.substring(0, start) + text + currentText.substring(end);
      
      setFormData(prev => ({ ...prev, notes: newText }));
      
      // Ripristina il focus e sposta il cursore dopo il testo inserito
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
  };

  const handleFormatSelection = (wrapper: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = formData.notes || '';
      const selectedText = currentText.substring(start, end);
      
      // Avvolge la selezione (o inserisce wrapper vuoto se nessuna selezione)
      const newText = currentText.substring(0, start) + wrapper + selectedText + wrapper + currentText.substring(end);
      
      setFormData(prev => ({ ...prev, notes: newText }));
      
      setTimeout(() => {
          textarea.focus();
          // Se c'era testo selezionato, riselezionalo all'interno dei wrapper
          // Se non c'era testo, posiziona il cursore tra i due wrapper
          textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
      }, 0);
  };

  // Funzione semplice per renderizzare il markdown in HTML per l'anteprima
  const renderMarkdown = (text: string) => {
      if (!text) return <span className="text-gray-400 italic">Nessun testo inserito. Clicca su "Scrivi" per iniziare.</span>;
      
      let html = text
        // Escape HTML tags to prevent XSS (basic)
        .replace(/</g, "&lt;").replace(/>/g, "&gt;")
        // Bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic (*text*)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Horizontal Rule (---)
        .replace(/---/g, '<hr class="my-4 border-gray-300 dark:border-gray-600" />')
        // Newlines
        .replace(/\n/g, '<br />');

      return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData as Post); 
    setIsSaving(false);
  };

  const handleDeleteClick = () => {
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!formData.id) return;
    setIsDeleting(true);
    try {
        await onDelete(formData.id);
    } catch (error) {
        console.error("Error deleting post:", error);
        setIsDeleting(false);
        alert("Errore durante l'eliminazione del post.");
    }
  };

  const handleDuplicate = () => {
    // Rimuoviamo la proprietà 'id' destrutturando l'oggetto,
    // così non passiamo 'id: undefined' a Firestore (che causerebbe errore)
    const { id, ...postDataWithoutId } = formData;

    const duplicatedPost: Partial<Post> = {
        ...postDataWithoutId,
        // MODIFICA: "(Copia)" viene messo all'inizio del titolo
        title: `(Copia) ${formData.title}`,
        // MODIFICA RICHIESTA: Manteniamo lo stato originale invece di resettarlo a Draft
        status: formData.status, 
        history: [] // La copia non eredita la storia
    };
    setFormData(duplicatedPost);
    setShowDeleteConfirm(false);
    alert("Post duplicato! Ora sei in modalità creazione copia. Modifica i dettagli se necessario e clicca su 'Salva'.");
  };

  const openLink = (url?: string) => {
      if (!url) return;
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRestoreVersion = (version: PostVersion) => {
      if (window.confirm(`Vuoi ripristinare la versione del ${moment(version.timestamp).format('DD/MM/YYYY HH:mm')}?`)) {
          setFormData({
              ...formData,
              ...version.data
          });
          setShowHistory(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {formData?.id ? 'Modifica Post' : 'Nuovo Post'}
            </h2>
            {formData.history && formData.history.length > 0 && (
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
                >
                    ⏱️ {showHistory ? 'Nascondi Cronologia' : 'Cronologia'}
                </button>
            )}
        </div>

        {/* Campagna Info Banner (Se in modalità campagna) */}
        {forcedCampaignId && (
            <div className={`mb-4 border p-3 rounded-lg flex items-center gap-3 text-sm transition-colors ${formData.hiddenFromCalendar ? 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'}`}>
                <span className="text-xl">{formData.hiddenFromCalendar ? '👻' : '📅'}</span>
                <div className="flex-grow">
                    <p className="font-bold">{formData.hiddenFromCalendar ? 'Nascosto dal Calendario' : 'Visibile nel Calendario'}</p>
                    <p className="text-xs opacity-80">Questo post fa parte di una campagna.</p>
                </div>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={!formData.hiddenFromCalendar} onChange={handleToggleHidden} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${!formData.hiddenFromCalendar ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!formData.hiddenFromCalendar ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                </label>
            </div>
        )}

        {showHistory && formData.history && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600 max-h-40 overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Versioni Precedenti</h3>
                <div className="space-y-2">
                    {[...formData.history].reverse().map((version, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm text-sm">
                            <div>
                                <span className="font-medium">{moment(version.timestamp).format('DD/MM/YYYY')}</span>
                                <span className="text-gray-400 mx-1">alle</span>
                                <span className="font-medium">{moment(version.timestamp).format('HH:mm')}</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => handleRestoreVersion(version)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs underline"
                            >
                                Ripristina
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data e Ora</label>
            <input 
                type="datetime-local" 
                name="date" 
                value={formData.date || ''} 
                onChange={handleChange} 
                className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titolo del post</label>
            <div className="flex relative">
                <input 
                    type="text" 
                    name="title" 
                    placeholder="Titolo del post" 
                    value={formData.title || ''} 
                    onChange={handleChange} 
                    className="mt-1 w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" 
                />
                <button 
                    type="button"
                    onClick={handleCopyTitle}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-transparent rounded"
                    title="Copia titolo"
                >
                    {showCopyFeedback ? (
                        <span className="text-green-500 text-xs font-bold">Copiato!</span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Canale Social</label>
                <select name="social" value={formData.social} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500">
                    {socialChannels.map(channel => <option key={channel.id} value={channel.name}>{channel.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stato</label>
                <select name="status" value={formData.status} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 capitalize">
                    {POST_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo di contenuto</label>
                <select name="postType" value={formData.postType} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 capitalize">
                    {POST_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assegnato a</label>
                <select name="assignedTo" value={formData.assignedTo || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500">
                    <option value="">-- Nessuno --</option>
                    {teamMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link Esterno (opzionale)</label>
            <div className="flex gap-2 relative">
                <input 
                    type="text" 
                    name="externalLink" 
                    placeholder="https://..." 
                    value={formData.externalLink || ''} 
                    onChange={handleChange} 
                    className={`mt-1 w-full p-2 border rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${urlErrors.external ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} 
                />
                {formData.externalLink && (
                    <button 
                        type="button" 
                        onClick={() => openLink(formData.externalLink)} 
                        className="mt-1 px-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-200"
                        title="Apri link"
                    >
                        🔗
                    </button>
                )}
            </div>
            {urlErrors.external && <p className="text-red-500 text-xs mt-1">{urlErrors.external}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link Creatività/Media (opzionale)</label>
            <div className="flex gap-2 relative">
                <input 
                    type="text" 
                    name="creativityLink" 
                    placeholder="https://..." 
                    value={formData.creativityLink || ''} 
                    onChange={handleChange} 
                    className={`mt-1 w-full p-2 border rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${urlErrors.creativity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} 
                />
                {formData.creativityLink && (
                    <button 
                        type="button" 
                        onClick={() => openLink(formData.creativityLink)} 
                        className="mt-1 px-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-200"
                        title="Apri link"
                    >
                        🔗
                    </button>
                )}
            </div>
            {urlErrors.creativity && <p className="text-red-500 text-xs mt-1">{urlErrors.creativity}</p>}
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Note e Copy</label>
                
                {/* Mode Toggles */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 border border-gray-200 dark:border-gray-600">
                    <button
                        type="button"
                        onClick={() => setNoteMode('edit')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${noteMode === 'edit' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        ✏️ Scrivi
                    </button>
                    <button
                        type="button"
                        onClick={() => setNoteMode('preview')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${noteMode === 'preview' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        👁️ Anteprima
                    </button>
                </div>
            </div>
            
            {noteMode === 'edit' ? (
                <>
                    {/* Formatting Toolbar */}
                    <div className="flex gap-2 mb-1 p-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto items-center">
                        <button type="button" onClick={() => handleFormatSelection('**')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200" title="Grassetto (Markdown)">B</button>
                        <button type="button" onClick={() => handleFormatSelection('*')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-xs italic font-serif text-gray-700 dark:text-gray-200" title="Corsivo (Markdown)">I</button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-1"></div>
                        <button type="button" onClick={() => handleInsertText('• ')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-xs" title="Elenco puntato">•</button>
                        <button type="button" onClick={() => handleInsertText('➡️ ')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-xs" title="Freccia">➡️</button>
                        <button type="button" onClick={() => handleInsertText('\n---\n')} className="w-8 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-xs" title="Separatore">---</button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-1"></div>
                        <button type="button" onClick={() => handleInsertText('🔥')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-sm">🔥</button>
                        <button type="button" onClick={() => handleInsertText('✅')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-sm">✅</button>
                        <button type="button" onClick={() => handleInsertText('📅')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-sm">📅</button>
                        <button type="button" onClick={() => handleInsertText('⚠️')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-sm">⚠️</button>
                        <button type="button" onClick={() => handleInsertText('📢')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-sm">📢</button>
                        <button type="button" onClick={() => handleInsertText('👇')} className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded text-sm">👇</button>
                    </div>

                    <textarea 
                        ref={textareaRef}
                        name="notes" 
                        placeholder="Scrivi qui le note o il testo del post... (Usa **bold** o *italic*)" 
                        value={formData.notes || ''} 
                        onChange={handleChange} 
                        rows={6} 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    ></textarea>
                </>
            ) : (
                <div className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[160px] prose dark:prose-invert text-sm max-w-none">
                    {renderMarkdown(formData.notes || '')}
                </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 sm:gap-0 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 w-full sm:w-auto min-h-[40px]">
            {formData.id && (
                <>
                    {!showDeleteConfirm ? (
                        <>
                            <button 
                                type="button"
                                onClick={handleDeleteClick} 
                                disabled={isDeleting} 
                                className="flex-1 sm:flex-none bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-md hover:bg-red-200 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                Elimina
                            </button>
                            <button 
                                type="button"
                                onClick={handleDuplicate} 
                                disabled={isSaving || isDeleting} 
                                className="flex-1 sm:flex-none bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 rounded-md hover:bg-amber-200 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                Duplica
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 animate-fadeIn w-full sm:w-auto justify-center sm:justify-start">
                            <span className="text-sm font-medium text-red-800 dark:text-red-300">Sicuro?</span>
                            <button 
                                onClick={handleConfirmDelete}
                                type="button"
                                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm shadow-sm"
                            >
                                Sì
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                type="button"
                                className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-sm shadow-sm"
                            >
                                No
                            </button>
                        </div>
                    )}
                </>
            )}
            </div>
            <div className="flex justify-end gap-3 w-full sm:w-auto">
                <button onClick={onClose} type="button" className="flex-1 sm:flex-none bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    Annulla
                </button>
                <button onClick={handleSave} type="button" disabled={isSaving || isDeleting || !!urlErrors.external || !!urlErrors.creativity} className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium shadow-sm">
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
