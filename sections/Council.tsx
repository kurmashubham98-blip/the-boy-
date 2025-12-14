import React, { useState } from 'react';
import { User, Question, Solution } from '../types';
import { Button, Card, Input, TextArea } from '../components/Components';

interface CouncilProps {
    user: User;
    users: User[];
    questions: Question[];
    onVoteQuestion: (qId: string, type: 'up' | 'down') => void;
    onAddQuestion: (q: Partial<Question>) => void;
    onEditQuestion: (qId: string, title: string, content: string) => void;
    onAddSolution: (qId: string, solution: string) => void;
    onVoteSolution: (qId: string, sId: string) => void;
    onMarkBestAnswer: (qId: string, sId: string) => void;
    isAdmin: boolean;
}

export const Council: React.FC<CouncilProps> = ({ user, users, questions, onVoteQuestion, onAddQuestion, onEditQuestion, onAddSolution, onVoteSolution, onMarkBestAnswer, isAdmin }) => {
    const [newQTitle, setNewQTitle] = useState('');
    const [newQDesc, setNewQDesc] = useState('');
    const [solvingId, setSolvingId] = useState<string | null>(null);
    const [solutionText, setSolutionText] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const submitQuestion = () => {
        if (!newQTitle) return;
        onAddQuestion({ title: newQTitle, content: newQDesc });
        setNewQTitle('');
        setNewQDesc('');
    };

    const startEdit = (q: Question) => {
        setEditingId(q.id);
        setEditTitle(q.title);
        setEditDesc(q.content);
    };

    const saveEdit = (qId: string) => {
        onEditQuestion(qId, editTitle, editDesc);
        setEditingId(null);
    };

    // Filter Questions
    const filteredQuestions = questions.filter(q => {
        const isSolved = q.solutions.some(s => s.isBestAnswer);
        if (activeTab === 'active') return !isSolved && !q.dropped;
        if (activeTab === 'archive') return isSolved;
        return false;
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-center gap-4 mb-4">
                <Button
                    variant={activeTab === 'active' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('active')}
                >
                    ACTIVE OPERATIONS
                </Button>
                <Button
                    variant={activeTab === 'archive' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('archive')}
                >
                    ARCHIVES (RESOLVED)
                </Button>
            </div>

            {activeTab === 'active' && (
                <Card title="Propose to The Council">
                    <div className="space-y-4">
                        <Input placeholder="Question / Challenge Title" value={newQTitle} onChange={e => setNewQTitle(e.target.value)} />
                        <TextArea placeholder="Details..." value={newQDesc} onChange={e => setNewQDesc(e.target.value)} />
                        <Button onClick={submitQuestion} className="w-full">Post for Review</Button>
                        {!isAdmin && <p className="text-xs text-red-400 text-center">Warning: If The Boys reject this (-5 votes), you lose 5 points.</p>}
                    </div>
                </Card>
            )}

            <div className="space-y-6">
                {filteredQuestions.map(q => {
                    const hasVotedQ = q.upvotes.includes(user.id) || q.downvotes.includes(user.id);
                    const score = q.upvotes.length - q.downvotes.length;

                    return (
                        <Card key={q.id} className="relative overflow-hidden">
                            {q.isInterestCheck && (
                                <div className="absolute top-0 right-0 flex gap-2">
                                    {/* 5 Minute Edit Window */}
                                    {user.id === q.authorId && Date.now() - new Date(q.createdAt).getTime() < 5 * 60 * 1000 && (
                                        <button
                                            onClick={() => startEdit(q)}
                                            className="bg-blue-600 text-white text-xs px-2 py-1 rounded-bl hover:bg-blue-500"
                                        >
                                            EDIT
                                        </button>
                                    )}
                                    <div className="bg-yellow-600/20 text-yellow-500 text-xs px-2 py-1 rounded-bl">
                                        VOTING PHASE
                                    </div>
                                </div>
                            )}
                            {/* Archived Badge */}
                            {activeTab === 'archive' && (
                                <div className="absolute top-0 right-0 bg-green-600/20 text-green-500 text-xs px-4 py-1 rounded-bl font-mono">
                                    RESOLVED
                                </div>
                            )}

                            <div className="mb-4">
                                {editingId === q.id ? (
                                    <div className="space-y-2 mb-4 bg-black/40 p-3 rounded border border-blue-900">
                                        <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Edit Title" />
                                        <TextArea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Edit Details" />
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                                            <Button onClick={() => saveEdit(q.id)}>Save Changes</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold">{q.title}</h3>
                                        <p className="text-gray-400 mt-2">{q.content}</p>
                                    </>
                                )}
                            </div>

                            {q.isInterestCheck ? (
                                <div className="flex gap-4 items-center bg-black/20 p-3 rounded-lg">
                                    <span className="text-sm text-gray-400">Is this worthy?</span>
                                    <Button
                                        variant="ghost"
                                        disabled={hasVotedQ}
                                        onClick={() => onVoteQuestion(q.id, 'up')}
                                        className={q.upvotes.includes(user.id) ? 'text-green-400' : ''}
                                    >
                                        👍 Interest
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={hasVotedQ}
                                        onClick={() => onVoteQuestion(q.id, 'down')}
                                        className={q.downvotes.includes(user.id) ? 'text-red-400' : ''}
                                    >
                                        👎 Drop
                                    </Button>
                                    <span className="ml-auto font-mono text-gray-500">Score: {score}</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="border-t border-gray-800 pt-4">
                                        <h4 className="font-bold text-sm text-gray-500 mb-2">SOLUTIONS</h4>
                                        {q.solutions.length === 0 && <p className="text-sm text-gray-600 italic">No plans submitted yet.</p>}
                                        <div className="space-y-3">
                                            {q.solutions.map(sol => {
                                                const hasVotedSol = q.solutions.some(s => s.votes.includes(user.id)); // One vote per question logic
                                                const isAuthor = sol.authorId === user.id;
                                                // Show author only if user has voted or is admin (simulated "voting closed" state for viewer)
                                                const showAuthor = hasVotedSol || isAdmin || isAuthor;
                                                const authorName = users.find(u => u.id === sol.authorId)?.name || 'Unknown Boy';

                                                return (
                                                    <div key={sol.id} className={`p-3 rounded flex justify-between items-center ${sol.isBestAnswer ? 'bg-green-900/30 border border-green-600' : 'bg-black/30'}`}>
                                                        <div className="flex-1">
                                                            {sol.isBestAnswer && (
                                                                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded mb-1 inline-block">✓ BEST ANSWER (+10 XP)</span>
                                                            )}
                                                            <p className="text-sm">{sol.content}</p>
                                                            {showAuthor && <p className="text-xs text-neon-blue mt-1">By: {isAuthor ? 'You' : authorName}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isAdmin && !sol.isBestAnswer && !q.solutions.some(s => s.isBestAnswer) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    className="text-xs text-yellow-500"
                                                                    onClick={() => onMarkBestAnswer(q.id, sol.id)}
                                                                >
                                                                    ⭐ Mark Best
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                className={`text-sm ${sol.votes.includes(user.id) ? 'text-neon-green' : 'text-gray-500'}`}
                                                                onClick={() => onVoteSolution(q.id, sol.id)}
                                                                disabled={hasVotedSol && !sol.votes.includes(user.id)}
                                                            >
                                                                ▲ {sol.votes.length}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {solvingId === q.id ? (
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                placeholder="Your plan..."
                                                value={solutionText}
                                                onChange={e => setSolutionText(e.target.value)}
                                            />
                                            <Button onClick={() => {
                                                onAddSolution(q.id, solutionText);
                                                setSolvingId(null);
                                                setSolutionText('');
                                            }}>Submit</Button>
                                        </div>
                                    ) : (
                                        <Button variant="secondary" className="w-full mt-2" onClick={() => setSolvingId(q.id)}>
                                            Add Solution
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
