import React, { useState, useEffect, useRef } from 'react';
import { User, Bounty, BountySubmission, UserRole, BountyStatus, SubmissionStatus } from '../types';
import { StorageService } from '../services/storageService';
import { Card, Button, Input, Badge } from '../components/Components';
import { v4 as uuidv4 } from 'uuid';

interface TargetListProps {
    user: User;
}

export const TargetList: React.FC<TargetListProps> = ({ user }) => {
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [submissions, setSubmissions] = useState<BountySubmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Admin: Create Bounty
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newReward, setNewReward] = useState(100);

    // User: Submit Bounty
    const [selectedBountyId, setSelectedBountyId] = useState<string | null>(null);
    const [proofImage, setProofImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Admin: View Submissions
    const [viewingSubmissions, setViewingSubmissions] = useState(false);

    const isAdmin = user.role === UserRole.ADMIN;

    useEffect(() => {
        loadData();
    }, [viewingSubmissions]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await StorageService.getBounties();
            setBounties(data);
            if (isAdmin && viewingSubmissions) {
                const subs = await StorageService.getSubmissions();
                setSubmissions(subs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBounty = async () => {
        if (!newTitle.trim() || !newDesc.trim()) return;
        setIsLoading(true);
        try {
            await StorageService.createBounty({
                id: uuidv4(),
                title: newTitle,
                description: newDesc,
                reward: newReward,
                status: BountyStatus.OPEN
            });
            setNewTitle('');
            setNewDesc('');
            setNewReward(100);
            await loadData();
        } catch (e) {
            alert("Failed to deploy target");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large (Max 5MB)");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setProofImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmitProof = async () => {
        if (!selectedBountyId || !proofImage) return;
        setIsLoading(true);
        try {
            await StorageService.submitBounty({
                id: uuidv4(),
                bountyId: selectedBountyId,
                userId: user.id,
                proof: proofImage,
                status: SubmissionStatus.PENDING
            });
            setSelectedBountyId(null);
            setProofImage(null);
            alert("Intel uploaded to secure server.");
        } catch (e) {
            alert("Upload failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (submissionId: string, status: string, bountyId: string, userId: string, reward: number) => {
        if (!window.confirm(`Confirm ${status} for this intel?`)) return;
        setIsLoading(true);
        try {
            await StorageService.verifySubmission({
                submissionId,
                status,
                feedback: status === 'APPROVED' ? 'Good hunting.' : 'Intel insufficient.',
                bountyId,
                userId,
                reward
            });
            await loadData();
        } catch (e) {
            alert("Verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white tracking-tighter">
                    <span className="text-red-600">TARGET</span> LIST
                </h2>
                {isAdmin && (
                    <Button onClick={() => setViewingSubmissions(!viewingSubmissions)}>
                        {viewingSubmissions ? "VIEW TARGETS" : "INCOMING INTEL"}
                    </Button>
                )}
            </div>

            {isAdmin && viewingSubmissions ? (
                // --- ADMIN SUBMISSION REVIEW ---
                <div className="grid gap-6">
                    {submissions.length === 0 && <p className="text-gray-500">No incoming intel.</p>}
                    {submissions.map(sub => {
                        const relatedBounty = bounties.find(b => b.id === sub.bountyId);
                        return (
                            <Card key={sub.id} title={relatedBounty?.title || "Unknown Target"}>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Badge color={sub.status === 'PENDING' ? 'bg-yellow-600' : sub.status === 'APPROVED' ? 'bg-green-600' : 'bg-red-600'}>
                                            {sub.status}
                                        </Badge>
                                        <span className="text-xs text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-black/50 p-2 rounded border border-gray-800">
                                        <img src={sub.proof} alt="Proof" className="max-h-64 object-contain mx-auto" />
                                    </div>
                                    {sub.status === 'PENDING' && (
                                        <div className="flex gap-4 justify-end">
                                            <Button onClick={() => handleVerify(sub.id, 'REJECTED', sub.bountyId, sub.userId, 0)} variant="secondary">REJECT</Button>
                                            <Button onClick={() => handleVerify(sub.id, 'APPROVED', sub.bountyId, sub.userId, relatedBounty?.reward || 0)}>
                                                VERIFY (+{relatedBounty?.reward} XP)
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                // --- BOUNTY BOARD ---
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Admin Create Card */}
                    {isAdmin && (
                        <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col gap-4 text-center justify-center hover:border-red-600 transition-colors group">
                            <h3 className="text-xl font-bold text-gray-500 group-hover:text-red-500">DEPLOY NEW TARGET</h3>
                            <Input placeholder="Target Codename" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                            <Input placeholder="Briefing Data" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            <div className="flex items-center gap-2">
                                <span className="text-neon-yellow font-bold">XP:</span>
                                <input
                                    type="number"
                                    value={newReward}
                                    onChange={e => setNewReward(Number(e.target.value))}
                                    className="bg-black/50 border border-gray-700 text-white px-2 py-1 rounded w-24"
                                />
                            </div>
                            <Button onClick={handleCreateBounty} disabled={isLoading}>INITIATE</Button>
                        </div>
                    )}

                    {/* Bounty Cards */}
                    {bounties.map(b => (
                        <div key={b.id} className="relative bg-black/80 border border-red-900/50 rounded-xl overflow-hidden shadow-lg shadow-red-900/20 group hover:scale-[1.02] transition-transform">
                            {/* "WANTED" Header */}
                            <div className="bg-gradient-to-r from-red-900 to-black p-3 border-b border-red-700 flex justify-between items-center">
                                <span className="font-mono text-red-500 text-xs tracking-widest">PRIORITY: HIGH</span>
                                <span className="font-black text-neon-yellow text-xl">{b.reward} XP</span>
                            </div>

                            <div className="p-6 space-y-4">
                                <h3 className="text-2xl font-black text-white uppercase truncate">{b.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed min-h-[3rem]">{b.description}</p>

                                <div className="pt-4 border-t border-gray-800">
                                    <Button onClick={() => setSelectedBountyId(b.id)} className="w-full">
                                        SUBMIT INTEL
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Submission Modal */}
            {selectedBountyId && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl max-w-lg w-full space-y-6">
                        <h3 className="text-2xl font-bold text-white">UPLOAD INTEL</h3>
                        <p className="text-gray-400 text-sm">Target: {bounties.find(b => b.id === selectedBountyId)?.title}</p>

                        <div
                            className="border-2 border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {proofImage ? (
                                <img src={proofImage} alt="Preview" className="max-h-48 object-contain" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <p className="text-4xl mb-2">📷</p>
                                    <p>Click to upload screenshot</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                        <div className="flex gap-4 justify-end">
                            <Button variant="secondary" onClick={() => { setSelectedBountyId(null); setProofImage(null); }}>CANCEL</Button>
                            <Button onClick={handleSubmitProof} disabled={!proofImage || isLoading}>TRANSMIT</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
