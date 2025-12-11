import React, { useState } from 'react';
import { User, Question, Solution } from '../types';
import { Button, Card, Input, TextArea } from '../components/Components';

interface CouncilProps {
    user: User;
    users: User[];
    questions: Question[];
    onVoteQuestion: (qId: string, type: 'up' | 'down') => void;
    onAddQuestion: (q: Partial<Question>) => void;
    onAddSolution: (qId: string, solution: string) => void;
    onVoteSolution: (qId: string, sId: string) => void;
    isAdmin: boolean;
}

export const Council: React.FC<CouncilProps> = ({ user, users, questions, onVoteQuestion, onAddQuestion, onAddSolution, onVoteSolution, isAdmin }) => {
    const [newQTitle, setNewQTitle] = useState('');
    const [newQDesc, setNewQDesc] = useState('');
    const [solvingId, setSolvingId] = useState<string | null>(null);
    const [solutionText, setSolutionText] = useState('');

    const submitQuestion = () => {
        if (!newQTitle) return;
        onAddQuestion({ title: newQTitle, content: newQDesc });
        setNewQTitle('');
        setNewQDesc('');
    };

    return (
        <div className="space-y-8">
            <Card title="Propose to The Council">
                <div className="space-y-4">
                    <Input placeholder="Question / Challenge Title" value={newQTitle} onChange={e => setNewQTitle(e.target.value)} />
                    <TextArea placeholder="Details..." value={newQDesc} onChange={e => setNewQDesc(e.target.value)} />
                    <Button onClick={submitQuestion} className="w-full">Post for Review</Button>
                    {!isAdmin && <p className="text-xs text-red-400 text-center">Warning: If The Boys reject this (-5 votes), you lose 5 points.</p>}
                </div>
            </Card>

            <div className="space-y-6">
                {questions.filter(q => !q.dropped).map(q => {
                    const hasVotedQ = q.upvotes.includes(user.id) || q.downvotes.includes(user.id);
                    const score = q.upvotes.length - q.downvotes.length;

                    return (
                        <Card key={q.id} className="relative overflow-hidden">
                            {q.isInterestCheck && (
                                <div className="absolute top-0 right-0 bg-yellow-600/20 text-yellow-500 text-xs px-2 py-1 rounded-bl">
                                    VOTING PHASE
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-xl font-bold">{q.title}</h3>
                                <p className="text-gray-400 mt-2">{q.content}</p>
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
                                                    <div key={sol.id} className="bg-black/30 p-3 rounded flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm">{sol.content}</p>
                                                            {showAuthor && <p className="text-xs text-neon-blue mt-1">By: {isAuthor ? 'You' : authorName}</p>}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            className={`text-sm ${sol.votes.includes(user.id) ? 'text-neon-green' : 'text-gray-500'}`}
                                                            onClick={() => onVoteSolution(q.id, sol.id)}
                                                            disabled={hasVotedSol && !sol.votes.includes(user.id)}
                                                        >
                                                            ▲ {sol.votes.length}
                                                        </Button>
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
