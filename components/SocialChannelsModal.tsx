import React, { useState, useEffect } from 'react';
import { SocialChannel, Post } from '../types';

interface SocialChannelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    channels: SocialChannel[];
    posts: Post[];
    onSave: (channels: SocialChannel[]) => void;
}

const SocialChannelsModal: React.FC<SocialChannelsModalProps> = ({ isOpen, onClose, channels, posts, onSave }) => {
    const [localChannels, setLocalChannels] = useState<SocialChannel[]>([]);
    const [editingChannel, setEditingChannel] = useState<SocialChannel | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalChannels(JSON.parse(JSON.stringify(channels))); // Deep copy to edit locally
        }
    }, [channels, isOpen]);

    const handleAddChannel = () => {
        setEditingChannel({ id: '', name: '', color: '#000000' });
    };

    const handleEditChannel = (channel: SocialChannel) => {
        setEditingChannel({ ...channel });
    };
    
    const handleDeleteChannel = (channelId: string) => {
        const channelToDelete = localChannels.find(c => c.id === channelId);
        if (!channelToDelete) return;

        const isChannelInUse = posts.some(p => p.social === channelToDelete.name);
        if (isChannelInUse) {
            alert("Impossibile eliminare il canale perché è utilizzato in uno o più post.");
            return;
        }

        if (window.confirm(`Sei sicuro di voler eliminare il canale "${channelToDelete.name}"?`)) {
            setLocalChannels(prev => prev.filter(c => c.id !== channelId));
        }
    };

    const handleSaveEditingChannel = () => {
        if (!editingChannel || !editingChannel.name.trim()) {
            alert("Il nome del canale non può essere vuoto.");
            return;
        }

        if (editingChannel.id) { // Editing existing
            setLocalChannels(prev => prev.map(c => c.id === editingChannel.id ? editingChannel : c));
        } else { // Adding new
            setLocalChannels(prev => [...prev, { ...editingChannel, id: new Date().getTime().toString() }]);
        }
        setEditingChannel(null);
    };

    const handleSaveChangesAndClose = () => {
        onSave(localChannels);
        onClose();
    };
    
    const handleCancelEdit = () => {
        setEditingChannel(null);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Gestisci Canali Social</h2>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mb-4">
                    {localChannels.map(channel => (
                        <div key={channel.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: channel.color }}></div>
                                <span className="font-medium">{channel.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEditChannel(channel)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Modifica</button>
                                <button onClick={() => handleDeleteChannel(channel.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Elimina</button>
                            </div>
                        </div>
                    ))}
                </div>

                {editingChannel ? (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-600 mt-4 space-y-3">
                        <h3 className="font-semibold">{editingChannel.id ? 'Modifica Canale' : 'Aggiungi Canale'}</h3>
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                placeholder="Nome Canale"
                                value={editingChannel.name}
                                onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                                className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
                            />
                            <input
                                type="color"
                                value={editingChannel.color}
                                onChange={(e) => setEditingChannel({ ...editingChannel, color: e.target.value })}
                                className="w-10 h-10 p-1 border-none rounded-md cursor-pointer bg-gray-50 dark:bg-gray-700"
                            />
                        </div>
                         <div className="flex justify-end gap-2">
                            <button onClick={handleCancelEdit} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-md">Annulla</button>
                            <button onClick={handleSaveEditingChannel} className="px-3 py-1 bg-blue-600 text-white rounded-md">{editingChannel.id ? 'Aggiorna Canale' : 'Salva Canale'}</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleAddChannel} className="w-full mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        + Aggiungi Nuovo Canale
                    </button>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Annulla</button>
                    <button onClick={handleSaveChangesAndClose} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Salva Modifiche</button>
                </div>
            </div>
        </div>
    );
};

export default SocialChannelsModal;