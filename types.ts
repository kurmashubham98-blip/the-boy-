export enum UserRole {
  ADMIN = 'ADMIN',
  BOY = 'BOY',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  points: number;
  level: number;
  joinedAt: string;
  deviceDetails?: string; // New field for security check
  avatar?: string;
  customTags?: string[];
}

export enum TaskType {
  WEEKLY = 'WEEKLY',
  LONG_TERM = 'LONG_TERM',
  SUB_GOAL = 'SUB_GOAL'
}

export enum TaskCategory {
  STUDY = 'STUDY',
  FITNESS = 'FITNESS',
  CODING = 'CODING',
  OTHER = 'OTHER'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  type: TaskType;
  category: TaskCategory;
  createdBy: string; // Admin ID
  isGroupTask: boolean;
  completedBy: string[]; // User IDs
  createdAt: string;
  expiresAt?: string;
}

export interface Question {
  id: string;
  authorId: string;
  title: string;
  content: string;
  isInterestCheck: boolean; // True if in "Draft/Interest" phase
  upvotes: string[]; // User IDs
  downvotes: string[]; // User IDs
  dropped: boolean; // If dropped, user loses 5 points
  solutions: Solution[];
  createdAt: string;
}

export interface Solution {
  id: string;
  authorId: string;
  content: string;
  votes: string[]; // User IDs
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  tasks: Task[];
  questions: Question[];
}

// Global window augmentation for Gemini API Key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}