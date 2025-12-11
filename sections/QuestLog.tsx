import React, { useState } from 'react';
import { User, Task, TaskType, TaskCategory } from '../types';
import { Button, Card, Badge, Input, TextArea } from '../components/Components';

interface QuestLogProps {
    user: User;
    tasks: Task[];
    onClaim: (taskId: string) => void;
    isAdmin: boolean;
    onCreateTask: (task: Task) => void;
}

export const QuestLog: React.FC<QuestLogProps> = ({ user, tasks, onClaim, isAdmin, onCreateTask }) => {
    const [showCreate, setShowCreate] = useState(false);
    const [newTask, setNewTask] = useState<Partial<Task>>({ type: TaskType.WEEKLY, category: TaskCategory.OTHER });

    const handleCreate = () => {
        if (newTask.title && newTask.points) {
            onCreateTask({
                id: Date.now().toString(),
                title: newTask.title,
                description: newTask.description || '',
                points: Number(newTask.points),
                type: newTask.type as TaskType,
                category: newTask.category as TaskCategory,
                createdBy: user.id,
                isGroupTask: false,
                completedBy: [],
                createdAt: new Date().toISOString()
            });
            setShowCreate(false);
            setNewTask({ type: TaskType.WEEKLY, category: TaskCategory.OTHER });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tighter">Active Missions</h2>
                {isAdmin && (
                    <Button onClick={() => setShowCreate(!showCreate)} variant="primary">
                        {showCreate ? 'Cancel' : '+ New Operation'}
                    </Button>
                )}
            </div>

            {showCreate && (
                <Card className="border-neon-purple/50">
                    <div className="space-y-4">
                        <Input
                            placeholder="Mission Title"
                            value={newTask.title || ''}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        />
                        <TextArea
                            placeholder="Briefing (Description)"
                            value={newTask.description || ''}
                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                placeholder="Points Reward"
                                value={newTask.points || ''}
                                onChange={e => setNewTask({ ...newTask, points: Number(e.target.value) })}
                            />
                            <select
                                className="bg-black/20 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                value={newTask.category}
                                onChange={e => setNewTask({ ...newTask, category: e.target.value as TaskCategory })}
                            >
                                {Object.values(TaskCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <Button onClick={handleCreate} className="w-full">Initialize Mission</Button>
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                {tasks.map(task => {
                    const isCompleted = task.completedBy.includes(user.id);
                    return (
                        <Card key={task.id} className={`transition-all ${isCompleted ? 'opacity-50 border-green-900' : 'hover:border-neon-blue/50'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge color={task.category === TaskCategory.CODING ? 'bg-blue-600' : task.category === TaskCategory.FITNESS ? 'bg-red-600' : 'bg-gray-600'}>
                                            {task.category}
                                        </Badge>
                                        {task.type === TaskType.WEEKLY && <Badge color="bg-purple-600">WEEKLY</Badge>}
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{task.title}</h3>
                                    <p className="text-gray-400 text-sm mb-4">{task.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-mono font-bold text-neon-green">+{task.points}</div>
                                    <div className="text-xs text-gray-500">XP REWARD</div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                                <Button
                                    disabled={isCompleted}
                                    onClick={() => onClaim(task.id)}
                                    variant={isCompleted ? 'ghost' : 'primary'}
                                >
                                    {isCompleted ? 'Mission Accomplished' : 'Claim Completion'}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
