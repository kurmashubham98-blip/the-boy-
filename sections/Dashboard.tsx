import React, { useEffect } from 'react';
import { User, UserRole } from '../types';
import { Card, Badge } from '../components/Components';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
    user: User;
    users: User[];
    onLevelCheck: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, users, onLevelCheck }) => {
    const nextLevelPoints = user.level * 1000;
    const progress = (user.points / nextLevelPoints) * 100;

    useEffect(() => {
        onLevelCheck();
    }, [user.points, onLevelCheck]);

    const sortedUsers = users
        .filter(u => u.role !== UserRole.REJECTED && u.role !== UserRole.PENDING)
        .sort((a, b) => b.points - a.points);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Player Stats" className="border-neon-blue/30">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center text-2xl font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{user.name}</h2>
                            <Badge color="bg-neon-purple">Level {user.level}</Badge>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>EXP Progress</span>
                            <span>{user.points} / {nextLevelPoints}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-neon-blue h-full transition-all duration-500"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>
                </Card>

                <Card title="Leaderboard">
                    <div className="space-y-3">
                        {sortedUsers.map((u, idx) => (
                            <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <span className={`font-mono font-bold w-6 ${idx === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{idx + 1}</span>
                                    <span>{u.name}</span>
                                    {u.role === UserRole.ADMIN && <span className="text-xs text-red-500 font-mono">[ADMIN]</span>}
                                </div>
                                <span className="font-mono text-neon-green">{u.points} PTS</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <Card title="Growth Chart">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedUsers}>
                            <XAxis dataKey="name" stroke="#52525b" />
                            <YAxis stroke="#52525b" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                itemStyle={{ color: '#e4e4e7' }}
                            />
                            <Bar dataKey="points" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};
