import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Button, Card, Input, Badge } from '../components/Components';

interface ProfileProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
    const [tags, setTags] = useState<string[]>(user.customTags || []);
    const [tagInput, setTagInput] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError("Image too large (Max 2MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Update User immediately
            onUpdateUser({ ...user, avatar: base64String });
        };
        reader.readAsDataURL(file);
    };

    const addTag = () => {
        if (!tagInput.trim()) return;
        if (tags.length >= 3) {
            setError("Max 3 tags allowed.");
            return;
        }
        if (tagInput.length > 10) {
            setError("Tag too long (Max 10 chars).");
            return;
        }
        const newTags = [...tags, tagInput.toUpperCase().trim()];
        setTags(newTags);
        setTagInput('');
        setError('');

        // Save (Partial update logic handled by App.tsx)
        onUpdateUser({ ...user, customTags: newTags });
    };

    const removeTag = (idx: number) => {
        const newTags = tags.filter((_, i) => i !== idx);
        setTags(newTags);
        onUpdateUser({ ...user, customTags: newTags });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <Card title="Agent Profile">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-32 h-32 rounded-full border-2 border-neon-blue group overflow-hidden bg-black/50">
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-600">
                                    {user.name.charAt(0)}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}>
                                <span className="text-xs text-neon-blue font-bold">UPLOAD</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                        <p className="text-xs text-gray-500">Max 2MB</p>
                    </div>

                    {/* Details Section */}
                    <div className="flex-1 space-y-6 w-full">
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Codename</label>
                            <h2 className="text-3xl font-black text-white">{user.name}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Role</label>
                                <div className="mt-1"><Badge color={user.role === 'ADMIN' ? 'bg-red-600' : 'bg-blue-600'}>{user.role === 'BOY' ? 'BOYS' : user.role}</Badge></div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Level</label>
                                <p className="text-xl font-mono text-neon-purple mt-1">Lvl {user.level}</p>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2 block">Custom Tags ({tags.length}/3)</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {tags.map((tag, idx) => (
                                    <span key={idx} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 flex items-center gap-2">
                                        {tag}
                                        <button onClick={() => removeTag(idx)} className="text-red-500 hover:text-white">×</button>
                                    </span>
                                ))}
                                {tags.length === 0 && <span className="text-sm text-gray-600 italic">No tags assigned.</span>}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add Tag (e.g. SNIPER)"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    maxLength={10}
                                />
                                <Button onClick={addTag}>Add</Button>
                            </div>
                            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Device Security">
                <div className="bg-black/30 p-4 rounded border border-gray-800 font-mono text-xs text-gray-400 break-all">
                    {user.deviceDetails}
                </div>
            </Card>
        </div>
    );
};
