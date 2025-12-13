import { User, Task, Question, UserRole } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://the-boy.onrender.com/api';

// Helper to handle fetch errors
const apiFetch = async (endpoint: string, options?: RequestInit) => {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return await res.json();
  } catch (err: any) {
    console.error(`Fetch failed for ${endpoint}:`, err);
    alert(`CONNECTION ERROR: ${err.message}\nCheck specific error in Console (F12).`);
    // Fallback? Retrow? For now, rethrow or return empty to prevent crash
    if (endpoint.includes('users')) return [];
    return [];
  }
};

export const StorageService = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    return await apiFetch('/users');
  },

  saveUsers: async (users: User[]) => {
    // We send a batch update/upsert
    await apiFetch('/users/batch', {
      method: 'POST',
      body: JSON.stringify(users)
    });
  },

  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
    return await apiFetch('/tasks');
  },

  saveTasks: async (tasks: Task[]) => {
    await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(tasks)
    });
  },

  // --- QUESTIONS ---
  getQuestions: async (): Promise<Question[]> => {
    return await apiFetch('/questions');
  },

  saveQuestions: async (questions: Question[]) => {
    await apiFetch('/questions', {
      method: 'POST',
      body: JSON.stringify(questions)
    });
  },

  // Helper to clear DB
  resetDB: async () => {
    // Not implemented for SQL backend safety
    console.warn("Reset DB not supported in SQL mode via this button");
  }
};