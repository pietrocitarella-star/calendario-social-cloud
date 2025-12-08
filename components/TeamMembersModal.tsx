
import React, { useState, useEffect } from 'react';
import { TeamMember, Post } from '../types';

interface TeamMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamMembers: TeamMember[];
    posts: Post[];
    onSave: (members: TeamMember[]) => void;
}

const TeamMembersModal: React.FC<TeamMembersModalProps> = ({ isOpen, onClose, teamMembers, posts, onSave }) => {
    const [localMembers, setLocalMembers] = useState<TeamMember[]>([]);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalMembers(JSON.parse(JSON.stringify(teamMembers))); // Deep copy
        }
    }, [teamMembers, isOpen]);

    const handleAddMember = () => {
        // Genera un colore random carino
        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setEditingMember({ id: '', name: '', color: randomColor });
    };

    const handleEditMember = (member: TeamMember) => {
        setEditingMember({ ...member });
    };
    
    const handleDeleteMember = (memberId: string) => {
        const memberToDelete = localMembers.find(m => m.id === memberId);
        if (!memberToDelete) return;

        // Opzionale: controlla se è assegnato a dei post. 
        // A differenza dei canali, potremmo voler permettere l'eliminazione lasciando il post "orfano" o resettandolo,
        // ma per sicurezza avvisiamo.
        const isAssigned = posts.some(p => p.assignedTo === memberId);
        if (isAssigned) {
            if (!window.confirm(`Questo utente è assegnato a dei post. Se lo elimini, quei post perderanno l'assegnazione. Vuoi procedere?`)) {
                return;
            }
        } else {
             if (!window.confirm(`Sei sicuro di voler eliminare "${memberToDelete.name}" dal team?`)) {
                return;
            }
        }

        setLocalMembers(prev => prev.filter(m => m.id !== memberId));
    };

    const handleSaveEditingMember = () => {
        if (!editingMember || !editingMember.name.trim()) {
            alert("Il nome non può essere vuoto.");
            return;
        }

        if (editingMember.id) { // Editing existing
            setLocalMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m));
        } else { // Adding new
            setLocalMembers(prev => [...prev, { ...editingMember, id: new Date().getTime().toString() }]);
        }
        setEditingMember(null);
    };

    const handleSaveChangesAndClose = () => {
        onSave(localMembers);
        onClose();
    };
    
    const handleCancelEdit = () => {
        setEditingMember(null);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Gestisci Team</h2>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mb-4">
                    {localMembers.length === 0 && (
                        <div className="text-center text-gray-500 py-4 italic">Nessun membro nel team. Aggiungine uno!</div>
                    )}
                    {localMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: member.color }}>
                                    {member.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{member.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEditMember(member)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">Modifica</button>
                                <button onClick={() => handleDeleteMember(member.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm">Elimina</button>
                            </div>
                        </div>
                    ))}
                </div>

                {editingMember ? (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-600 mt-4 space-y-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{editingMember.id ? 'Modifica Collega' : 'Aggiungi Collega'}</h3>
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                placeholder="Nome e Cognome"
                                value={editingMember.name}
                                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <input
                                type="color"
                                value={editingMember.color}
                                onChange={(e) => setEditingMember({ ...editingMember, color: e.target.value })}
                                className="w-10 h-10 p-1 border-none rounded-md cursor-pointer bg-gray-50 dark:bg-gray-700"
                                title="Scegli colore avatar"
                            />
                        </div>
                         <div className="flex justify-end gap-2">
                            <button onClick={handleCancelEdit} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-md text-sm text-gray-800 dark:text-gray-200">Annulla</button>
                            <button onClick={handleSaveEditingMember} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">{editingMember.id ? 'Aggiorna' : 'Aggiungi'}</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleAddMember} className="w-full mt-4 p-2 bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300 text-sm font-medium">
                        + Aggiungi Nuovo Membro
                    </button>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Chiudi</button>
                    <button onClick={handleSaveChangesAndClose} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Salva Team</button>
                </div>
            </div>
        </div>
    );
};

export default TeamMembersModal;