import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { User, AuthTokens, GameRoom, Question, LearningAttempt } from '../../shared/types';

// 认证状态
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: true,

        setUser: (user) => set({ user, isAuthenticated: !!user }),
        
        setTokens: (tokens) => set({ tokens }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        login: (user, tokens) => set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        }),
        
        logout: () => set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        }),
        
        updateUser: (updates) => {
          const { user } = get();
          if (user) {
            set({ user: { ...user, ...updates } });
          }
        },
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

// 游戏状态
interface GameState {
  currentRoom: GameRoom | null;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  score: number;
  streak: number;
  isGameActive: boolean;
  participants: Array<{ id: string; nickname: string; score: number; rank: number }>;
  
  // Actions
  setCurrentRoom: (room: GameRoom | null) => void;
  setCurrentQuestion: (question: Question | null, index: number) => void;
  setTimeRemaining: (time: number) => void;
  updateScore: (points: number) => void;
  updateStreak: (correct: boolean) => void;
  setGameActive: (active: boolean) => void;
  updateParticipants: (participants: any[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      currentRoom: null,
      currentQuestion: null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      timeRemaining: 0,
      score: 0,
      streak: 0,
      isGameActive: false,
      participants: [],

      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      
      setCurrentQuestion: (currentQuestion, currentQuestionIndex) => set({
        currentQuestion,
        currentQuestionIndex,
      }),
      
      setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
      
      updateScore: (points) => {
        const { score } = get();
        set({ score: score + points });
      },
      
      updateStreak: (correct) => {
        const { streak } = get();
        set({ streak: correct ? streak + 1 : 0 });
      },
      
      setGameActive: (isGameActive) => set({ isGameActive }),
      
      updateParticipants: (participants) => set({ participants }),
      
      resetGame: () => set({
        currentRoom: null,
        currentQuestion: null,
        currentQuestionIndex: 0,
        totalQuestions: 0,
        timeRemaining: 0,
        score: 0,
        streak: 0,
        isGameActive: false,
        participants: [],
      }),
    }),
    { name: 'GameStore' }
  )
);

// 学习状态
interface LearningState {
  currentModule: string | null;
  currentLevel: string;
  dailyGoal: number;
  dailyProgress: number;
  weeklyStreak: number;
  totalXP: number;
  recentAttempts: LearningAttempt[];
  
  // Actions
  setCurrentModule: (module: string | null) => void;
  setCurrentLevel: (level: string) => void;
  updateDailyProgress: (progress: number) => void;
  updateWeeklyStreak: (streak: number) => void;
  updateTotalXP: (xp: number) => void;
  addRecentAttempt: (attempt: LearningAttempt) => void;
  resetDailyProgress: () => void;
}

export const useLearningStore = create<LearningState>()(
  devtools(
    persist(
      (set, get) => ({
        currentModule: null,
        currentLevel: 'A1',
        dailyGoal: 50, // XP
        dailyProgress: 0,
        weeklyStreak: 0,
        totalXP: 0,
        recentAttempts: [],

        setCurrentModule: (currentModule) => set({ currentModule }),
        
        setCurrentLevel: (currentLevel) => set({ currentLevel }),
        
        updateDailyProgress: (progress) => set({ dailyProgress: progress }),
        
        updateWeeklyStreak: (weeklyStreak) => set({ weeklyStreak }),
        
        updateTotalXP: (totalXP) => set({ totalXP }),
        
        addRecentAttempt: (attempt) => {
          const { recentAttempts } = get();
          const newAttempts = [attempt, ...recentAttempts].slice(0, 10); // 保留最近10次
          set({ recentAttempts: newAttempts });
        },
        
        resetDailyProgress: () => set({ dailyProgress: 0 }),
      }),
      {
        name: 'learning-storage',
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: 'LearningStore' }
  )
);

// UI状态
interface UIState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  sidebarOpen: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
  }>;
  isOnline: boolean;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        language: 'en',
        sidebarOpen: true,
        notifications: [],
        isOnline: true,

        setTheme: (theme) => set({ theme }),
        
        setLanguage: (language) => set({ language }),
        
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
        
        addNotification: (notification) => {
          const { notifications } = get();
          const newNotification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
          };
          set({ notifications: [...notifications, newNotification] });
          
          // 自动清除通知
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, 5000);
        },
        
        removeNotification: (id) => {
          const { notifications } = get();
          set({ notifications: notifications.filter(n => n.id !== id) });
        },
        
        setOnlineStatus: (isOnline) => set({ isOnline }),
      }),
      {
        name: 'ui-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

// WebSocket 状态
interface WebSocketState {
  socket: any;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Actions
  setSocket: (socket: any) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    (set) => ({
      socket: null,
      connected: false,
      connecting: false,
      error: null,

      setSocket: (socket) => set({ socket }),
      setConnected: (connected) => set({ connected }),
      setConnecting: (connecting) => set({ connecting }),
      setError: (error) => set({ error }),
    }),
    { name: 'WebSocketStore' }
  )
);

// 性能监控状态
interface PerformanceState {
  loadTime: number;
  renderTime: number;
  apiResponseTimes: Record<string, number[]>;
  errorCount: number;
  
  // Actions
  setLoadTime: (time: number) => void;
  setRenderTime: (time: number) => void;
  addApiResponseTime: (endpoint: string, time: number) => void;
  incrementErrorCount: () => void;
  resetStats: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    (set, get) => ({
      loadTime: 0,
      renderTime: 0,
      apiResponseTimes: {},
      errorCount: 0,

      setLoadTime: (loadTime) => set({ loadTime }),
      
      setRenderTime: (renderTime) => set({ renderTime }),
      
      addApiResponseTime: (endpoint, time) => {
        const { apiResponseTimes } = get();
        const times = apiResponseTimes[endpoint] || [];
        const newTimes = [...times, time].slice(-10); // 保留最近10次
        set({
          apiResponseTimes: {
            ...apiResponseTimes,
            [endpoint]: newTimes,
          },
        });
      },
      
      incrementErrorCount: () => {
        const { errorCount } = get();
        set({ errorCount: errorCount + 1 });
      },
      
      resetStats: () => set({
        loadTime: 0,
        renderTime: 0,
        apiResponseTimes: {},
        errorCount: 0,
      }),
    }),
    { name: 'PerformanceStore' }
  )
);

// Store 选择器 - 用于性能优化
export const useAuthUser = () => useAuthStore(state => state.user);
export const useAuthTokens = () => useAuthStore(state => state.tokens);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);

export const useCurrentRoom = () => useGameStore(state => state.currentRoom);
export const useGameScore = () => useGameStore(state => state.score);
export const useGameStreak = () => useGameStore(state => state.streak);

export const useTheme = () => useUIStore(state => state.theme);
export const useNotifications = () => useUIStore(state => state.notifications);

// 复合选择器
export const useGameProgress = () => useGameStore(state => ({
  currentQuestionIndex: state.currentQuestionIndex,
  totalQuestions: state.totalQuestions,
  progress: state.totalQuestions > 0 ? (state.currentQuestionIndex / state.totalQuestions) * 100 : 0,
}));

export const useLearningStats = () => useLearningStore(state => ({
  dailyProgress: state.dailyProgress,
  dailyGoal: state.dailyGoal,
  progressPercentage: (state.dailyProgress / state.dailyGoal) * 100,
  weeklyStreak: state.weeklyStreak,
  totalXP: state.totalXP,
}));

// Store 重置函数 - 用于测试和登出
export const resetAllStores = () => {
  useAuthStore.getState().logout();
  useGameStore.getState().resetGame();
  useLearningStore.setState({
    currentModule: null,
    dailyProgress: 0,
    weeklyStreak: 0,
    recentAttempts: [],
  });
  useUIStore.setState({
    notifications: [],
  });
  usePerformanceStore.getState().resetStats();
};

// 开发环境下的调试工具
if (process.env.NODE_ENV === 'development') {
  (window as any).__stores__ = {
    auth: useAuthStore,
    game: useGameStore,
    learning: useLearningStore,
    ui: useUIStore,
    websocket: useWebSocketStore,
    performance: usePerformanceStore,
  };
}
