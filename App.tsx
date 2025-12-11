import React, { useState, useEffect, useCallback } from 'react';
import { User, Task, Question, UserRole } from './types';
import { StorageService } from './services/storageService';
import { Button, Input } from './components/Components';
import { IncomingSignalAlert } from './components/IncomingSignalAlert';
import { Dashboard } from './sections/Dashboard';
import { QuestLog } from './sections/QuestLog';
import { Council } from './sections/Council';
import { AILab } from './sections/AILab';
import { AdminPanel } from './sections/AdminPanel';

// --- MAIN APP ---

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'quests' | 'council' | 'ai' | 'admin'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from DB (Now Async)
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [userNameInput, setUserNameInput] = useState('');
  const [pendingStatus, setPendingStatus] = useState(false);

  // Real-time Polling
  useEffect(() => {
    // Only poll if we have initialized
    if (isLoading) return;

    const intervalId = setInterval(async () => {
      // 1. Fetch Fresh Users to check for new recruits or status updates
      const fetchedUsers = await StorageService.getUsers();

      // Update users list if changed (Naive deep compare for prototype)
      setUsers(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(fetchedUsers)) {
          return fetchedUsers;
        }
        return prev;
      });

      // 2. If user is PENDING, check if they have been approved
      if (pendingStatus && user) {
        const me = fetchedUsers.find(u => u.id === user.id);
        if (me) {
          if (me.role === UserRole.BOY) {
            setUser(me);
            setPendingStatus(false);
          } else if (me.role === UserRole.REJECTED) {
            setUser(null);
            setPendingStatus(false);
            setUserNameInput('');
            alert("CONNECTION TERMINATED: ACCESS DENIED BY ADMIN.");
          }
        }
      }

    }, 4000); // Check every 4 seconds

    return () => clearInterval(intervalId);
  }, [isLoading, user, pendingStatus]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      const [u, t, q] = await Promise.all([
        StorageService.getUsers(),
        StorageService.getTasks(),
        StorageService.getQuestions()
      ]);
      setUsers(u);
      setTasks(t);
      setQuestions(q);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Level Logic
  const checkLevelUp = useCallback(async () => {
    if (!user) return;
    const calculatedLevel = Math.min(10, Math.floor(user.points / 1000) + 1);
    if (calculatedLevel > user.level) {
      const updated = { ...user, level: calculatedLevel };
      setUser(updated);

      const newUsers = users.map(u => u.id === user.id ? updated : u);
      setUsers(newUsers);
      await StorageService.saveUsers(newUsers);
    }
  }, [user, users]);

  // Login / Register Sim
  const handleLogin = async () => {
    if (!userNameInput.trim()) return;

    setIsLoading(true);
    // Refresh users just in case
    const currentUsers = await StorageService.getUsers();
    setUsers(currentUsers);

    const existing = currentUsers.find(u => u.name.toLowerCase() === userNameInput.toLowerCase());

    if (existing) {
      if (existing.role === UserRole.REJECTED) {
        alert("ACCESS DENIED. You have been blacklisted from The Boys.");
        setIsLoading(false);
        return;
      }
      if (existing.role === UserRole.PENDING) {
        setPendingStatus(true);
        // Temporarily set user so polling knows who to check
        setUser(existing);
        setIsLoading(false);
        return;
      }
      setUser(existing);
      setPendingStatus(false);
    } else {
      // Capture Device Info
      const userAgent = navigator.userAgent;

      const newUser: User = {
        id: Date.now().toString(),
        name: userNameInput,
        role: UserRole.PENDING,
        points: 0,
        level: 1,
        joinedAt: new Date().toISOString(),
        deviceDetails: userAgent
      };

      const newUsers = [...currentUsers, newUser];
      await StorageService.saveUsers(newUsers);
      setUsers(newUsers);
      setUser(newUser); // Set user so polling can check this ID
      setPendingStatus(true);
    }
    setIsLoading(false);
  };

  // Admin Approval
  const approveUser = async (id: string) => {
    const newUsers = users.map(u => u.id === id ? { ...u, role: UserRole.BOY } : u);
    setUsers(newUsers);
    await StorageService.saveUsers(newUsers);
  };

  const rejectUser = async (id: string) => {
    const newUsers = users.map(u => u.id === id ? { ...u, role: UserRole.REJECTED } : u);
    setUsers(newUsers);
    await StorageService.saveUsers(newUsers);
  };

  // Task Claiming
  const claimTask = async (taskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completedBy.includes(user.id)) {
      let pointsAwarded = task.points;
      let newUsersList = [...users];

      if (task.isGroupTask) {
        // Distribute points among all completers (including new one)
        const oldCompleters = task.completedBy;
        const newCount = oldCompleters.length + 1;
        const newPointsPerPerson = Math.floor(task.points / newCount);
        pointsAwarded = newPointsPerPerson; // For the current claimer

        // Adjust points for previous completers
        if (oldCompleters.length > 0) {
          const oldPointsPerPerson = Math.floor(task.points / oldCompleters.length);
          const delta = newPointsPerPerson - oldPointsPerPerson; // e.g. 25 - 50 = -25

          newUsersList = newUsersList.map(u => {
            if (oldCompleters.includes(u.id)) {
              return { ...u, points: u.points + delta };
            }
            return u;
          });
        }
      }

      const updatedTask = { ...task, completedBy: [...task.completedBy, user.id] };
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);

      // Update current user points
      const updatedUser = { ...user, points: user.points + pointsAwarded };

      // Merge current user update into the list (which might have other updates)
      newUsersList = newUsersList.map(u => u.id === user.id ? updatedUser : u);

      // Optimistic update
      setTasks(updatedTasks);
      setUser(updatedUser);
      setUsers(newUsersList);

      // Persist
      await StorageService.saveTasks(updatedTasks);
      await StorageService.saveUsers(newUsersList);
    }
  };

  // Create Task (Admin)
  const createTask = async (task: Task) => {
    const newTasks = [task, ...tasks];
    setTasks(newTasks);
    await StorageService.saveTasks(newTasks);
  };

  // Question Logic
  const addQuestion = async (qPartial: Partial<Question>) => {
    if (!user) return;
    const isAdmin = user.role === UserRole.ADMIN;
    const newQ: Question = {
      id: Date.now().toString(),
      authorId: user.id,
      title: qPartial.title!,
      content: qPartial.content!,
      isInterestCheck: !isAdmin,
      upvotes: [],
      downvotes: [],
      dropped: false,
      solutions: [],
      createdAt: new Date().toISOString()
    };
    const newQuestions = [newQ, ...questions];
    setQuestions(newQuestions);
    await StorageService.saveQuestions(newQuestions);
  };

  const voteQuestion = async (qId: string, type: 'up' | 'down') => {
    if (!user) return;
    const newQuestions = questions.map(q => {
      if (q.id !== qId) return q;
      const newUp = type === 'up' ? [...q.upvotes, user.id] : q.upvotes;
      const newDown = type === 'down' ? [...q.downvotes, user.id] : q.downvotes;

      let isDropped = q.dropped;
      if (newDown.length >= 2 && newDown.length > newUp.length) {
        isDropped = true;
        // Note: Logic for punishment side-effect needs to handle user array update separately
      }

      return { ...q, upvotes: newUp, downvotes: newDown, dropped: isDropped, isInterestCheck: isDropped ? false : q.isInterestCheck };
    });

    setQuestions(newQuestions);
    await StorageService.saveQuestions(newQuestions);

    // Handle dropping punishment (side effect)
    const droppedQ = newQuestions.find(q => q.id === qId);
    if (droppedQ && droppedQ.dropped) {
      const author = users.find(u => u.id === droppedQ.authorId);
      if (author) {
        const punished = { ...author, points: Math.max(0, author.points - 5) };
        const newUsers = users.map(u => u.id === author.id ? punished : u);
        setUsers(newUsers);
        if (user.id === author.id) setUser(punished);
        await StorageService.saveUsers(newUsers);
      }
    }
  };

  const addSolution = async (qId: string, content: string) => {
    if (!user) return;
    const newQuestions = questions.map(q => {
      if (q.id !== qId) return q;
      return {
        ...q,
        solutions: [...q.solutions, { id: Date.now().toString(), authorId: user.id, content, votes: [] }]
      };
    });
    setQuestions(newQuestions);
    await StorageService.saveQuestions(newQuestions);
  };

  const voteSolution = async (qId: string, sId: string) => {
    if (!user) return;
    const newQuestions = questions.map(q => {
      if (q.id !== qId) return q;
      const hasVotedAny = q.solutions.some(s => s.votes.includes(user.id));
      if (hasVotedAny) return q;

      return {
        ...q,
        solutions: q.solutions.map(s => s.id === sId ? { ...s, votes: [...s.votes, user.id] } : s)
      };
    });
    setQuestions(newQuestions);
    await StorageService.saveQuestions(newQuestions);
  };

  // Helper for login screen to auto-fill
  const quickLogin = (name: string) => {
    setUserNameInput(name);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-void flex items-center justify-center text-neon-blue font-mono animate-pulse">CONNECTING TO DATABASE...</div>;
  }

  if (pendingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="max-w-md w-full p-8 text-center space-y-6 border border-yellow-600/30 rounded-xl bg-void-light/50 backdrop-blur">
          <h1 className="text-3xl font-black text-yellow-500 tracking-tighter">ACCESS PENDING</h1>
          <div className="text-gray-400 space-y-2">
            <p>Your request has been beamed to The Admin.</p>
            <p className="text-xs font-mono text-gray-500">Device Signature Captured.</p>
            <p className="text-xs text-yellow-700 animate-pulse mt-4">Awaiting uplink confirmation...</p>
          </div>
          <div className="animate-pulse w-full bg-yellow-900/20 h-2 rounded overflow-hidden">
            <div className="bg-yellow-500 h-full w-2/3"></div>
          </div>
          <Button onClick={() => setPendingStatus(false)} variant="ghost" className="w-full">
            Back / Cancel Request
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="max-w-md w-full p-8 text-center space-y-6">
          <h1 className="text-5xl font-black text-white tracking-tighter">THE BOYS</h1>
          <p className="text-gray-400">Enter your codename to initialize.</p>
          <Input
            value={userNameInput}
            onChange={e => setUserNameInput(e.target.value)}
            placeholder="Codename"
            className="text-center text-lg"
          />
          <Button onClick={handleLogin} className="w-full py-4 text-lg">ENTER SYSTEM</Button>

          <div className="flex justify-center gap-4 mt-8 pt-8 border-t border-gray-800/50">
            <button onClick={() => quickLogin('The Admin')} className="text-xs text-gray-600 hover:text-neon-purple transition-colors">
              [DEV: Login as Admin]
            </button>
            <button onClick={() => quickLogin('Rookie Boy')} className="text-xs text-gray-600 hover:text-neon-blue transition-colors">
              [DEV: Login as User]
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRecruits = users.filter(u => u.role === UserRole.PENDING);

  return (
    <div className="min-h-screen bg-void text-gray-200 font-sans selection:bg-neon-blue selection:text-white pb-20 md:pb-0 md:pl-64">
      {/* Alert Component - Only visible to ADMIN if there are pending recruits */}
      {user.role === UserRole.ADMIN && (
        <IncomingSignalAlert
          recruits={pendingRecruits}
          onApprove={approveUser}
          onReject={rejectUser}
          onOpenConsole={() => setView('admin')}
        />
      )}

      {/* Sidebar / Mobile Nav */}
      <nav className="fixed md:left-0 md:top-0 md:bottom-0 bottom-0 left-0 w-full md:w-64 bg-void-light border-t md:border-t-0 md:border-r border-gray-800 z-50 flex md:flex-col justify-around md:justify-start p-4 md:p-6 gap-2 md:gap-6">
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-white">THE BOYS</h1>
          <p className="text-xs text-neon-blue font-mono mt-1">EST. 2025</p>
        </div>

        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'quests', label: 'The Barracks', icon: '⚔️' },
          { id: 'council', label: 'The Council', icon: '⚖️' },
          { id: 'ai', label: 'AI Nexus', icon: '🤖' },
          ...(user.role === UserRole.ADMIN ? [{ id: 'admin', label: 'Admin Console', icon: '🛡️' }] : [])
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === item.id ? 'bg-neon-blue/10 text-neon-blue font-bold' : 'text-gray-500 hover:text-white'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="hidden md:block">{item.label}</span>
          </button>
        ))}

        {user.role === UserRole.ADMIN && (
          <div className="hidden md:block mt-auto border-t border-gray-800 pt-4 max-h-[30vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-gray-500">PENDING RECRUITS</h4>
              {pendingRecruits.length > 0 && <span className="text-[10px] bg-red-600 px-1.5 rounded-full text-white">{pendingRecruits.length}</span>}
            </div>

            {pendingRecruits.slice(0, 3).map(u => (
              <div key={u.id} className="bg-black/20 p-2 rounded mb-2 text-sm border border-gray-800">
                <div className="font-bold mb-1">{u.name}</div>
                <div className="text-[10px] text-gray-500 font-mono mb-2 truncate" title={u.deviceDetails}>
                  {u.deviceDetails || "Unknown Device"}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveUser(u.id)} className="flex-1 bg-green-900/30 text-green-500 text-xs py-1 rounded hover:bg-green-900/50">
                    Accept
                  </button>
                  <button onClick={() => rejectUser(u.id)} className="flex-1 bg-red-900/30 text-red-500 text-xs py-1 rounded hover:bg-red-900/50">
                    Deny
                  </button>
                </div>
              </div>
            ))}
            {pendingRecruits.length > 3 && (
              <button onClick={() => setView('admin')} className="w-full text-center text-xs text-neon-blue mt-1 hover:underline">
                + {pendingRecruits.length - 3} More
              </button>
            )}
            {pendingRecruits.length === 0 && <p className="text-xs text-gray-600">No signals detected.</p>}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 pt-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{view === 'quests' ? 'Active Operations' : view === 'council' ? 'The Council' : view === 'ai' ? 'AI Nexus' : view === 'admin' ? 'Admin Console' : 'Command Center'}</h2>
            <p className="text-gray-500 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white">{user.name}</div>
              <div className="text-xs text-neon-purple font-mono">Level {user.level}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {view === 'dashboard' && <Dashboard user={user} users={users} onLevelCheck={checkLevelUp} />}
        {view === 'quests' && (
          <QuestLog
            user={user}
            tasks={tasks}
            onClaim={claimTask}
            isAdmin={user.role === UserRole.ADMIN}
            onCreateTask={createTask}
          />
        )}
        {view === 'council' && (
          <Council
            user={user}
            users={users}
            questions={questions}
            onAddQuestion={addQuestion}
            onVoteQuestion={voteQuestion}
            onAddSolution={addSolution}
            onVoteSolution={voteSolution}
            isAdmin={user.role === UserRole.ADMIN}
          />
        )}
        {view === 'ai' && <AILab />}
        {view === 'admin' && user.role === UserRole.ADMIN && (
          <AdminPanel
            users={users}
            onApprove={approveUser}
            onReject={rejectUser}
          />
        )}
      </main>
    </div>
  );
};

export default App;