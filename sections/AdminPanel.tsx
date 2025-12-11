import React from 'react';
import { User, UserRole } from '../types';
import { Button, Card, Badge } from '../components/Components';

interface AdminPanelProps {
    users: User[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, onApprove, onReject }) => {
    const pending = users.filter(u => u.role === UserRole.PENDING);
    const active = users.filter(u => u.role === UserRole.BOY || u.role === UserRole.ADMIN);
    const rejected = users.filter(u => u.role === UserRole.REJECTED);

    return (
        <div className="space-y-8">
            {/* Pending Section */}
            <Card title={`Incoming Transmissions (${pending.length})`} icon="📡" className="border-yellow-500/30">
                {pending.length === 0 ? (
                    <div className="text-gray-500 text-center py-8 italic">No active signals detected. Frequencies clear.</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {pending.map(u => (
                            <div key={u.id} className="bg-yellow-900/10 border border-yellow-600/30 p-4 rounded-xl flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-xl font-bold text-white">{u.name}</h4>
                                        <p className="text-xs text-yellow-500 font-mono mt-1">{new Date(u.joinedAt).toLocaleString()}</p>
                                    </div>
                                    <Badge color="bg-yellow-600">WAITING</Badge>
                                </div>
                                <div className="bg-black/30 p-2 rounded text-xs font-mono text-gray-400 break-all border border-gray-800">
                                    <span className="text-gray-600 select-none">ID: </span>{u.id}<br />
                                    <span className="text-gray-600 select-none">DEVICE: </span>{u.deviceDetails || 'NO_DATA'}
                                </div>
                                <div className="flex gap-2 mt-auto pt-2">
                                    <Button onClick={() => onApprove(u.id)} className="flex-1 bg-green-600 hover:bg-green-500">AUTHORIZE UPLINK</Button>
                                    <Button onClick={() => onReject(u.id)} variant="danger" className="flex-1">TERMINATE CONNECTION</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Active Roster */}
            <Card title="Agent Roster" icon="👥">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-500 text-sm border-b border-gray-800">
                                <th className="p-3">Codename</th>
                                <th className="p-3">Level</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Joined</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.map(u => (
                                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold">{u.name}</td>
                                    <td className="p-3 text-neon-purple font-mono">Lvl {u.level}</td>
                                    <td className="p-3">
                                        <Badge color={u.role === UserRole.ADMIN ? 'bg-red-600' : 'bg-blue-600'}>{u.role}</Badge>
                                    </td>
                                    <td className="p-3 text-gray-500 text-sm font-mono">{new Date(u.joinedAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-right">
                                        {u.role !== UserRole.ADMIN && (
                                            <Button onClick={() => onReject(u.id)} variant="ghost" className="text-red-500 hover:bg-red-900/20 text-xs px-2 py-1 ml-auto">
                                                DISCHARGE
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Blacklist */}
            {rejected.length > 0 && (
                <div className="opacity-70">
                    <h4 className="text-red-900 text-xs font-bold uppercase mb-2 tracking-widest">Blacklisted Signals</h4>
                    <div className="flex gap-2 flex-wrap">
                        {rejected.map(u => (
                            <div key={u.id} className="px-3 py-1 bg-red-950/30 border border-red-900/50 text-red-700 text-xs rounded-full flex gap-2 items-center">
                                <span>{u.name}</span>
                                <button onClick={() => onApprove(u.id)} className="hover:text-red-400" title="Re-admit">↺</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
