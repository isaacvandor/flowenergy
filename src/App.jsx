import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Play, CheckCircle, Clock, Target, Calendar, Award, Settings, User, Home, BarChart3, Book, Timer, Zap, Brain, Heart } from 'lucide-react';

// Safe localStorage operations with validation
const safeLocalStorage = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      // Validate the parsed data structure
      if (key === 'userProfile' && parsed && typeof parsed === 'object') {
        // Ensure required properties exist
        if (!parsed.preferences || typeof parsed.preferences !== 'object') {
          console.warn('Invalid userProfile structure, using default');
          return defaultValue;
        }
      }
      if (key === 'completedSessions' && Array.isArray(parsed)) {
        return new Set(parsed);
      }
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      const serialized = key === 'completedSessions' && value instanceof Set 
        ? JSON.stringify([...value])
        : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
      return false;
    }
  }
};

const App = () => {
  // Mobile debugging - log to console for remote debugging
  useEffect(() => {
    console.log('App mounted on:', {
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      isMobile: /Mobi|Android/i.test(navigator.userAgent)
    });
    
    // Catch unhandled errors
    window.addEventListener('error', function(e) {
      console.error('Global error:', e.error);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
      console.error('Unhandled promise rejection:', e.reason);
    });
  }, []);

  // Generate anonymous user ID
  const generateUserId = () => {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Core app state
  const [currentScreen, setCurrentScreen] = useState('home');
  const [completedSessions, setCompletedSessions] = useState(() => {
    return safeLocalStorage.get('completedSessions', new Set());
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  const [userProfile, setUserProfile] = useState(() => {
    const defaultProfile = {
      userId: generateUserId(),
      name: 'ADHD Warrior',
      startDate: new Date().toLocaleDateString(),
      currentWeek: 1,
      preferences: {
        notifications: true,
        exerciseType: 'mixed',
        reminderTime: '09:00',
        soundEnabled: true,
        theme: 'light',
        highContrast: false,
        reduceMotion: false,
        extendedBreaks: false,
        skipComplex: false
      }
    };
    
    return safeLocalStorage.get('userProfile', defaultProfile);
  });

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState('general');

  // Session state
  const [currentActivity, setCurrentActivity] = useState(0);

  // Audio system
  const audioContext = useRef(null);
  const audioContextClosed = useRef(false);
  
  // Notification timer management
  const notificationTimer = useRef(null);
  const hasShownTestNotification = useRef(false);
  
  const initAudio = useCallback(() => {
    if (!audioContext.current && userProfile.preferences.soundEnabled && !audioContextClosed.current) {
      try {
        // Check if AudioContext is available (mobile-safe)
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContext.current = new AudioContextClass();
          audioContextClosed.current = false;
        }
      } catch (error) {
        console.log('Audio not supported:', error);
      }
    }
  }, [userProfile.preferences.soundEnabled]);

  const playSound = useCallback((frequency = 440, duration = 200, type = 'sine') => {
    if (!userProfile.preferences.soundEnabled || !audioContext.current) return;
    
    try {
      const oscillator = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration / 1000);
      
      oscillator.start(audioContext.current.currentTime);
      oscillator.stop(audioContext.current.currentTime + duration / 1000);
      
      // Clean up nodes after sound completes
      setTimeout(() => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch {
          // Nodes may already be garbage collected, which is fine
        }
      }, duration + 100); // Extra 100ms buffer
      
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }, [userProfile.preferences.soundEnabled]);

  const soundEffects = useMemo(() => ({
    click: () => playSound(800, 100, 'square'),
    sessionStart: () => playSound(523, 300, 'sine'), // C note
    sessionComplete: () => {
      // Play a chord progression for completion
      playSound(523, 200, 'sine'); // C
      setTimeout(() => playSound(659, 200, 'sine'), 100); // E
      setTimeout(() => playSound(784, 300, 'sine'), 200); // G
    },
    toggle: () => playSound(600, 150, 'triangle'),
    navigation: () => playSound(400, 100, 'sine')
  }), [playSound]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    safeLocalStorage.set('completedSessions', completedSessions);
  }, [completedSessions]);

  useEffect(() => {
    safeLocalStorage.set('userProfile', userProfile);
  }, [userProfile]);

  // Initialize audio context when sound is enabled
  useEffect(() => {
    if (userProfile.preferences.soundEnabled) {
      initAudio();
    }
  }, [userProfile.preferences.soundEnabled, initAudio]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContext.current && !audioContextClosed.current) {
        try {
          audioContext.current.close();
          audioContextClosed.current = true;
        } catch {
          // Context may already be closed
          audioContextClosed.current = true;
        }
      }
    };
  }, []);

  // Cleanup notification timer on unmount
  useEffect(() => {
    return () => {
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current);
        notificationTimer.current = null;
      }
    };
  }, []);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    const { theme } = userProfile.preferences;
    
    const applyTheme = (prefersDark = null) => {
      // Remove existing theme classes
      root.classList.remove('dark');
      
      if (theme === 'auto') {
        const isDark = prefersDark !== null ? prefersDark : 
          (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          root.classList.add('dark');
        }
      } else if (theme === 'dark') {
        root.classList.add('dark');
      }
      // light theme is default (no class needed)
    };

    applyTheme();

    // Listen for system theme changes when in auto mode
    let mediaQuery = null;
    let cleanup = null;
    
    if (theme === 'auto' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => applyTheme(e.matches);
      
      // Use modern addEventListener if available, fallback to deprecated method
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        cleanup = () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
        cleanup = () => mediaQuery.removeListener(handleChange);
      }
    }

    return cleanup || undefined;
  }, [userProfile.preferences.theme]);

  // Accessibility features management
  useEffect(() => {
    const root = document.documentElement;
    const { highContrast, reduceMotion } = userProfile.preferences;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [userProfile.preferences.highContrast, userProfile.preferences.reduceMotion]);

  // Safe date calculation utility
  const calculateNextNotificationTime = useCallback((reminderTime) => {
    const now = new Date();
    const [hours, minutes] = reminderTime.split(':').map(Number);
    
    // Validate time values
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn('Invalid reminder time format:', reminderTime);
      return null;
    }
    
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      
      // Handle month/year boundaries
      if (scheduledTime.getMonth() !== now.getMonth()) {
        // Date object automatically handles month/year overflow
      }
    }

    return scheduledTime;
  }, []);

  // Notification scheduling system
  useEffect(() => {
    // Clear any existing timer
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
      notificationTimer.current = null;
    }

    // Reset test notification flag when notifications are disabled
    if (!userProfile.preferences.notifications) {
      hasShownTestNotification.current = false;
      return undefined;
    }

    // Only proceed if notifications are enabled and permission granted
    if (!userProfile.preferences.notifications || Notification.permission !== 'granted') {
      return undefined;
    }

    // Clear existing service worker notifications
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.ready
        .then(registration => registration.getNotifications())
        .then(notifications => {
          notifications.forEach(notification => notification.close());
        })
        .catch(error => console.warn('Could not clear service worker notifications:', error));
    }

    const scheduleNextNotification = () => {
      const nextTime = calculateNextNotificationTime(userProfile.preferences.reminderTime);
      if (!nextTime) return;

      const now = new Date();
      const timeUntilNotification = nextTime.getTime() - now.getTime();
      
      // Don't schedule if the time is too far in the future (>25 hours) or negative
      if (timeUntilNotification < 0 || timeUntilNotification > 25 * 60 * 60 * 1000) {
        console.warn('Invalid notification scheduling time:', timeUntilNotification);
        return;
      }

      notificationTimer.current = setTimeout(() => {
        try {
          new Notification('Focus & Flow Reminder', {
            body: 'Time for your daily session! Your brain is ready for some dopamine boosting exercise and mindfulness.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'daily-reminder' // Prevent duplicate notifications
          });
        } catch (error) {
          console.error('Failed to show notification:', error);
        }
        
        // Schedule next notification (24 hours later)
        scheduleNextNotification();
      }, timeUntilNotification);
    };

    scheduleNextNotification();

    // Show test notification when notifications are first enabled (only once)
    if (userProfile.preferences.notifications && !hasShownTestNotification.current) {
      hasShownTestNotification.current = true;
      setTimeout(() => {
        try {
          new Notification('Notifications Enabled', {
            body: 'Daily reminders are now active! You\'ll receive reminders at your chosen time.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'test-notification'
          });
        } catch (error) {
          console.error('Failed to show test notification:', error);
        }
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current);
        notificationTimer.current = null;
      }
    };
  }, [userProfile.preferences.notifications, userProfile.preferences.reminderTime, calculateNextNotificationTime]);

  // Save user profile changes
  const updateUserProfile = (updates) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  // Save settings changes
  const updateSettings = (category, setting, value) => {
    soundEffects.toggle();
    setUserProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [setting]: value
      }
    }));
  };

  // Program data structure
  const programData = {
    1: {
      title: "Activation & Awareness",
      phase: "Foundation",
      phaseColor: "bg-blue-500",
      sessions: {
        "Mon/Wed/Fri": {
          duration: 15,
          activities: [
            { type: "movement", name: "Dynamic movement", duration: 5, description: "Jumping jacks, arm circles, marching" },
            { type: "mindfulness", name: "Brain.fm focus session", duration: 5, description: "Low setting with breathing awareness" },
            { type: "cognitive", name: "Task initiation practice", duration: 5, description: "Using the '5-minute rule'" }
          ]
        },
        "Tue/Thu": {
          duration: 10,
          activities: [
            { type: "movement", name: "Walking meditation", duration: 5, description: "Outdoors if possible" },
            { type: "cognitive", name: "Daily tracking setup", duration: 5, description: "Reflection and planning" }
          ]
        }
      },
      milestone: "Complete 3 sessions without skipping"
    },
    2: {
      title: "Building Momentum",
      phase: "Foundation",
      phaseColor: "bg-blue-500",
      sessions: {
        "Mon/Wed/Fri": {
          duration: 18,
          activities: [
            { type: "movement", name: "Moderate cardio", duration: 7, description: "Brisk walk, cycling, dancing" },
            { type: "mindfulness", name: "Brain.fm with body scan", duration: 6, description: "Medium setting" },
            { type: "cognitive", name: "Distractibility Delay Technique", duration: 5, description: "Practice focus skills" }
          ]
        },
        "Tue/Thu/Sat": {
          duration: 15,
          activities: [
            { type: "movement", name: "Open-skill activity", duration: 10, description: "Dance tutorial, shadow boxing" },
            { type: "cognitive", name: "STOP technique", duration: 5, description: "Impulse control practice" }
          ]
        }
      },
      milestone: "Track focus improvements using 1-10 scale"
    },
    3: {
      title: "Establishing Rhythms",
      phase: "Foundation",
      phaseColor: "bg-blue-500",
      sessions: {
        "Mon/Wed/Fri": {
          duration: 20,
          activities: [
            { type: "movement", name: "HIIT workout", duration: 8, description: "30 seconds work, 15 seconds rest" },
            { type: "mindfulness", name: "Brain.fm medium setting", duration: 7, description: "With mindful breathing" },
            { type: "cognitive", name: "Time awareness exercises", duration: 5, description: "Pomodoro introduction" }
          ]
        },
        "Tue/Thu": {
          duration: 20,
          activities: [
            { type: "movement", name: "Complex movement", duration: 10, description: "Yoga flow or martial arts forms" },
            { type: "mindfulness", name: "Walking meditation", duration: 5, description: "Mindful steps" },
            { type: "cognitive", name: "Evening routine planning", duration: 5, description: "Structure preparation" }
          ]
        }
      },
      milestone: "Successfully use Pomodoro for one work task"
    },
    4: {
      title: "Foundation Consolidation",
      phase: "Foundation",
      phaseColor: "bg-blue-500",
      sessions: {
        "Daily": {
          duration: "15-20",
          activities: [
            { type: "review", name: "Review & Practice", duration: "15-20", description: "Practice favorite combinations from weeks 1-3" }
          ]
        }
      },
      milestone: "Identify optimal exercise type and mindfulness approach"
    },
    5: {
      title: "Multimodal Magic",
      phase: "Integration",
      phaseColor: "bg-purple-500",
      sessions: {
        "Mon/Wed/Fri": {
          duration: 20,
          activities: [
            { type: "movement", name: "Open-skill exercise", duration: 10, description: "Tennis against wall, dance routine" },
            { type: "mindfulness", name: "Brain.fm with active mindfulness", duration: 6, description: "Higher engagement" },
            { type: "cognitive", name: "Cognitive restructuring", duration: 4, description: "Thought pattern work" }
          ]
        },
        "Tue/Thu": {
          duration: 20,
          activities: [
            { type: "movement", name: "Strength training circuit", duration: 8, description: "Bodyweight exercises" },
            { type: "mindfulness", name: "Progressive muscle relaxation", duration: 7, description: "Full body tension release" },
            { type: "cognitive", name: "Work productivity planning", duration: 5, description: "Email/meeting strategies" }
          ]
        }
      },
      milestone: "Complete one full workday using new strategies"
    },
    6: {
      title: "Cognitive-Physical Fusion",
      phase: "Integration",
      phaseColor: "bg-purple-500",
      sessions: {
        "Mon/Wed/Fri/Sat": {
          duration: 20,
          activities: [
            { type: "movement", name: "Exergaming", duration: 10, description: "Complex movement patterns" },
            { type: "mindfulness", name: "Brain.fm high setting", duration: 5, description: "With focus challenge" },
            { type: "cognitive", name: "Financial management", duration: 5, description: "Impulse control check-in" }
          ]
        },
        "Tue/Thu": {
          duration: 20,
          activities: [
            { type: "movement", name: "Interval training", duration: 12, description: "With cognitive tasks between sets" },
            { type: "mindfulness", name: "Mindful movement", duration: 8, description: "Movement meditation" }
          ]
        }
      },
      milestone: "Navigate one challenging situation using STOP technique"
    },
    7: {
      title: "Advanced Integration",
      phase: "Integration",
      phaseColor: "bg-purple-500",
      sessions: {
        "High Energy Days": {
          duration: 20,
          activities: [
            { type: "movement", name: "High-intensity open-skill", duration: 12, description: "Complex movement patterns" },
            { type: "mindfulness", name: "Quick mindfulness reset", duration: 5, description: "Focused breathing" },
            { type: "cognitive", name: "CBT skill application", duration: 3, description: "Real-world practice" }
          ]
        },
        "Low Energy Days": {
          duration: 20,
          activities: [
            { type: "movement", name: "Gentle movement", duration: 8, description: "Stretching and mobility" },
            { type: "mindfulness", name: "Extended Brain.fm focus", duration: 8, description: "Deep concentration" },
            { type: "cognitive", name: "Organization system", duration: 4, description: "Refine daily systems" }
          ]
        }
      },
      milestone: "Successfully adapt program to energy levels"
    },
    8: {
      title: "Integration Mastery",
      phase: "Integration",
      phaseColor: "bg-purple-500",
      sessions: {
        "Custom Design": {
          duration: 20,
          activities: [
            { type: "review", name: "Design your session", duration: 20, description: "Use all three modalities based on your preferences" }
          ]
        }
      },
      milestone: "Create personalized routine combinations"
    },
    9: {
      title: "Autonomous Practice",
      phase: "Mastery",
      phaseColor: "bg-green-500",
      sessions: {
        "Self-Designed": {
          duration: 20,
          activities: [
            { type: "movement", name: "Physical activity (40%)", duration: 8, description: "Your choice of movement" },
            { type: "mindfulness", name: "Mindfulness/Brain.fm (30%)", duration: 6, description: "Focus practice" },
            { type: "cognitive", name: "CBT/Life skills (30%)", duration: 6, description: "Practical application" }
          ]
        }
      },
      milestone: "Complete week without external reminders"
    },
    10: {
      title: "Life Integration",
      phase: "Mastery",
      phaseColor: "bg-green-500",
      sessions: {
        "Morning": {
          duration: 20,
          activities: [
            { type: "movement", name: "Energy activation", duration: 20, description: "Morning routine for optimal day start" }
          ]
        },
        "Afternoon": {
          duration: 20,
          activities: [
            { type: "cognitive", name: "Productivity protocols", duration: 20, description: "Workday enhancement strategies" }
          ]
        },
        "Evening": {
          duration: 20,
          activities: [
            { type: "mindfulness", name: "Wind-down sequence", duration: 20, description: "Prepare for restful sleep" }
          ]
        }
      },
      milestone: "Report improved functioning in target area"
    },
    11: {
      title: "Teaching & Refinement",
      phase: "Mastery",
      phaseColor: "bg-green-500",
      sessions: {
        "Teaching Practice": {
          duration: 20,
          activities: [
            { type: "review", name: "Teach one technique", duration: 20, description: "Share your knowledge with someone else" }
          ]
        }
      },
      milestone: "Successfully explain program benefits to others"
    },
    12: {
      title: "Graduation & Beyond",
      phase: "Mastery",
      phaseColor: "bg-green-500",
      sessions: {
        "Celebration": {
          duration: 20,
          activities: [
            { type: "review", name: "Favorite routines", duration: 20, description: "Practice what works best for you" }
          ]
        }
      },
      milestone: "Commit to specific long-term practice schedule"
    }
  };

  // Helper functions for date/time
  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[currentDate.getDay()];
  };

  const getFormattedDate = () => {
    return currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeOfDay = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getPhaseProgress = (week = userProfile.currentWeek) => {
    if (week <= 4) return { phase: "Foundation", progress: (week / 4) * 100 };
    if (week <= 8) return { phase: "Integration", progress: ((week - 4) / 4) * 100 };
    return { phase: "Mastery", progress: ((week - 8) / 4) * 100 };
  };

  // Session modification helpers
  const getAdjustedDuration = (originalDuration) => {
    if (userProfile.preferences.extendedBreaks) {
      return typeof originalDuration === 'number' ? originalDuration + 2 : originalDuration;
    }
    return originalDuration;
  };

  const filterComplexActivities = (activities) => {
    if (!userProfile.preferences.skipComplex) return activities;
    
    // More intelligent filtering - focus on truly complex activities
    const complexKeywords = [
      'exergaming',
      'complex movement patterns',
      'multi-step coordination',
      'coordination exercises'
    ];
    
    // Activities to preserve even if they contain some complex keywords
    const preserveKeywords = [
      'dance',
      'martial arts',
      'open-skill'
    ];
    
    return activities.filter(activity => {
      const activityText = `${activity.name} ${activity.description}`.toLowerCase();
      
      // If activity contains preserve keywords, keep it
      if (preserveKeywords.some(keyword => activityText.includes(keyword))) {
        return true;
      }
      
      // Otherwise, filter out if it contains complex keywords
      return !complexKeywords.some(keyword => activityText.includes(keyword));
    });
  };

  const getRecommendedSessionType = (weekData) => {
    const dayOfWeek = getDayOfWeek();
    const sessionTypes = Object.keys(weekData.sessions);
    
    // Map days to session types based on program schedule
    if (dayOfWeek === 'Monday' || dayOfWeek === 'Wednesday' || dayOfWeek === 'Friday') {
      const mwfSession = sessionTypes.find(type => 
        type.includes('Mon') || type.includes('Wed') || type.includes('Fri') || 
        type.includes('M/W/F') || type.includes('MWF')
      );
      if (mwfSession) return mwfSession;
    }
    
    if (dayOfWeek === 'Tuesday' || dayOfWeek === 'Thursday') {
      const tthSession = sessionTypes.find(type => 
        type.includes('Tue') || type.includes('Thu') || 
        type.includes('T/Th') || type.includes('TTh')
      );
      if (tthSession) return tthSession;
    }
    
    if (dayOfWeek === 'Saturday') {
      const satSession = sessionTypes.find(type => 
        type.includes('Sat') || type.includes('Saturday')
      );
      if (satSession) return satSession;
    }
    
    return sessionTypes[0]; // Default to first session type
  };

  const isRestDay = () => {
    const dayOfWeek = getDayOfWeek();
    return dayOfWeek === 'Sunday';
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'movement': return <Zap className="w-5 h-5 text-blue-500" />;
      case 'mindfulness': return <Brain className="w-5 h-5 text-purple-500" />;
      case 'cognitive': return <Target className="w-5 h-5 text-green-500" />;
      case 'review': return <Book className="w-5 h-5 text-orange-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTimeBasedMessage = () => {
    const timeOfDay = getTimeOfDay();
    if (timeOfDay === 'morning') {
      return { emoji: "🌅", message: "Perfect timing! Morning sessions provide the best dopamine boost for your day ahead." };
    }
    if (timeOfDay === 'afternoon') {
      return { emoji: "☀️", message: "Great time for a focus reset! This session will help you power through the rest of your day." };
    }
    return { emoji: "🌙", message: "Wind down with intention. Evening sessions help prepare your mind for restful sleep." };
  };

  // Session Timer Component
  const SessionTimer = ({ duration, onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(duration * 60);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const onCompleteRef = useRef(onComplete);

    // Keep onComplete callback up to date
    useEffect(() => {
      onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Reset timer when duration changes
    useEffect(() => {
      setTimeLeft(duration * 60);
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, [duration]);

    // Timer effect - only runs when isRunning changes
    useEffect(() => {
      if (isRunning) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              // Timer completed
              setIsRunning(false);
              if (onCompleteRef.current) {
                onCompleteRef.current();
              }
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }

      // Cleanup
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [isRunning]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="text-center p-6">
        <div className="text-6xl font-light mb-4 text-gray-800">
          {minutes}:{seconds < 10 ? '0' + seconds : seconds}
        </div>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-8 py-3 rounded-full text-white font-medium transition-colors ${
            isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={timeLeft === 0}
        >
          {timeLeft === 0 ? 'Complete' : isRunning ? 'Pause' : 'Start'}
        </button>
      </div>
    );
  };

  // Home Screen Component
  const HomeScreen = () => {
    const currentWeek = userProfile.currentWeek;
    const currentWeekData = programData[currentWeek];
    const phaseInfo = getPhaseProgress();
    const recommendedSessionType = getRecommendedSessionType(currentWeekData);
    const rawSession = currentWeekData.sessions[recommendedSessionType];
    const session = {
      ...rawSession,
      duration: getAdjustedDuration(rawSession.duration),
      activities: filterComplexActivities(rawSession.activities).map(activity => ({
        ...activity,
        duration: getAdjustedDuration(activity.duration)
      }))
    };
    const timeOfDay = getTimeOfDay();
    const timeMessage = getTimeBasedMessage();

    return (
      <div className="p-6 space-y-6">
        {/* Header with current date/time */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-gray-800 mb-2">Focus & Flow</h1>
          <p className="text-gray-600 mb-2">Week {currentWeek} • {currentWeekData.title}</p>
          <div className="text-sm text-gray-500">
            <p>{getFormattedDate()}</p>
            <p>Good {timeOfDay}! 🌟</p>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">{phaseInfo.phase} Phase</span>
            <span className="text-sm text-gray-500">{Math.round(phaseInfo.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${currentWeekData.phaseColor}`}
              style={{ width: `${phaseInfo.progress}%` }}
            />
          </div>
        </div>

        {/* Today's Session */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          {isRestDay() ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-pink-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Rest Day</h3>
              <p className="text-gray-600 text-sm mb-4">
                Take time to recover and reflect on your progress. You've earned it! 🌸
              </p>
              <div className="p-4 bg-pink-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Optional: Light stretching or a gentle walk if you feel up to it
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Today's Session</h3>
                <div className="text-right">
                  <div className="text-sm text-blue-600 font-medium">{recommendedSessionType}</div>
                  <div className="text-xs text-gray-500">{getDayOfWeek()}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-gray-700">Recommended for {timeOfDay}</span>
                <span className="text-sm text-gray-500">{session.duration} min</span>
              </div>
              
              <div className="space-y-3">
                {session.activities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">{activity.name}</p>
                      <p className="text-xs text-gray-600">{activity.description}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.duration} min</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => {
                  soundEffects.sessionStart();
                  setCurrentScreen('session');
                }}
                className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Start {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} Session</span>
              </button>
            </>
          )}
        </div>

        {/* Time-based motivation message */}
        <div className={`rounded-2xl p-4 border ${
          timeOfDay === 'morning' ? 'bg-yellow-50 border-yellow-200' :
          timeOfDay === 'afternoon' ? 'bg-blue-50 border-blue-200' :
          'bg-purple-50 border-purple-200'
        }`}>
          <p className="text-sm text-gray-700">
            {timeMessage.emoji} {timeMessage.message}
          </p>
        </div>

        {/* Week Milestone */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border">
          <div className="flex items-center space-x-3 mb-3">
            <Award className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Week Goal</h3>
          </div>
          <p className="text-gray-700">{currentWeekData.milestone}</p>
        </div>

        {/* Status Indicator Cards */}
        {(userProfile.preferences.highContrast || userProfile.preferences.reduceMotion || userProfile.preferences.extendedBreaks || userProfile.preferences.skipComplex) && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Active Accessibility Features</h4>
            <div className="space-y-1 text-sm text-blue-700">
              {userProfile.preferences.highContrast && <div>• High contrast mode enabled</div>}
              {userProfile.preferences.reduceMotion && <div>• Reduced motion active</div>}
              {userProfile.preferences.extendedBreaks && <div>• Extended break times (+2 min per activity)</div>}
              {userProfile.preferences.skipComplex && <div>• Complex activities filtered out</div>}
            </div>
          </div>
        )}

        {userProfile.preferences.notifications && Notification.permission === 'granted' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <h4 className="font-semibold text-green-800 mb-2">Daily Reminders Active</h4>
            <div className="text-sm text-green-700">
              <div>Next reminder: Tomorrow at {userProfile.preferences.reminderTime}</div>
              <div className="text-xs mt-1">You'll receive notifications for your daily sessions</div>
            </div>
          </div>
        )}

        {!userProfile.preferences.soundEnabled && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h4 className="font-semibold text-orange-800 mb-2">Sound Effects Disabled</h4>
            <div className="text-sm text-orange-700">
              Sound feedback is turned off. Enable in Settings for audio cues.
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-light text-blue-600 mb-1">{completedSessions.size}</div>
            <div className="text-xs text-gray-600">Sessions Complete</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <div className="text-2xl font-light text-green-600 mb-1">{currentWeek}</div>
            <div className="text-xs text-gray-600">Current Week</div>
          </div>
        </div>
      </div>
    );
  };

  // Session Screen Component
  const SessionScreen = () => {
    const currentWeek = userProfile.currentWeek;
    const currentWeekData = programData[currentWeek];
    const recommendedSessionType = getRecommendedSessionType(currentWeekData);
    const rawSession = currentWeekData.sessions[recommendedSessionType];
    const session = {
      ...rawSession,
      duration: getAdjustedDuration(rawSession.duration),
      activities: filterComplexActivities(rawSession.activities).map(activity => ({
        ...activity,
        duration: getAdjustedDuration(activity.duration)
      }))
    };
    const activity = session.activities[currentActivity];
    const timeOfDay = getTimeOfDay();

    const completeActivity = () => {
      if (currentActivity < session.activities.length - 1) {
        soundEffects.click();
        setCurrentActivity(currentActivity + 1);
      } else {
        // Session complete
        soundEffects.sessionComplete();
        const sessionKey = `week${currentWeek}-${recommendedSessionType}-${currentDate.toDateString()}`;
        setCompletedSessions(new Set([...completedSessions, sessionKey]));
        setCurrentActivity(0); // Reset for next time
        setCurrentScreen('complete');
      }
    };

    return (
      <div className="p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => {
            soundEffects.navigation();
            setCurrentScreen('home');
          }}>
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="text-center">
            <h2 className="font-semibold text-gray-800">Week {currentWeek}</h2>
            <p className="text-sm text-gray-600">{recommendedSessionType}</p>
            <p className="text-xs text-gray-500">{getDayOfWeek()} {timeOfDay}</p>
          </div>
          <div className="w-6" />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Activity {currentActivity + 1} of {session.activities.length}</span>
            <span>{activity.duration} min</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentActivity + 1) / session.activities.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Activity */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {getActivityIcon(activity.type)}
            </div>
            <h3 className="text-2xl font-light text-gray-800 mb-2">{activity.name}</h3>
            <p className="text-gray-600 px-4">{activity.description}</p>
          </div>

          <SessionTimer 
            duration={typeof activity.duration === 'number' ? activity.duration : 5} 
            onComplete={completeActivity}
          />
        </div>

        {/* Skip Button */}
        <button 
          onClick={completeActivity}
          className="mt-8 text-gray-500 text-center py-3 hover:text-gray-700 transition-colors"
        >
          Skip Activity
        </button>
      </div>
    );
  };

  // Week navigation functions
  const updateWeek = (newWeek) => {
    if (newWeek >= 1 && newWeek <= 12) {
      setUserProfile(prev => ({ ...prev, currentWeek: newWeek }));
    }
  };

  // Progress Screen Component
  const ProgressScreen = () => {
    const currentWeek = userProfile.currentWeek;
    const weeks = Object.keys(programData).map(Number).sort((a, b) => a - b);
    
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-light text-gray-800 text-center mb-6">Your Journey</h2>
        
        <div className="space-y-4">
          {weeks.map(week => {
            const weekData = programData[week];
            const isCompleted = week < currentWeek;
            const isCurrent = week === currentWeek;
            
            return (
              <div 
                key={week}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent ? 'border-blue-500 bg-blue-50' :
                  isCompleted ? 'border-green-500 bg-green-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                    isCompleted ? 'bg-green-500' :
                    isCurrent ? 'bg-blue-500' :
                    'bg-gray-300'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : week}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">Week {week}</h3>
                    <p className="text-sm text-gray-600">{weekData.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{weekData.phase} Phase</p>
                  </div>
                  {isCurrent && (
                    <button 
                      onClick={() => setCurrentScreen('home')}
                      className="text-blue-500"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="mt-3 p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600">{weekData.milestone}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Week Navigation */}
        <div className="flex justify-center space-x-4 pt-4">
          <button 
            onClick={() => updateWeek(Math.max(1, currentWeek - 1))}
            disabled={currentWeek === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
          >
            Previous Week
          </button>
          <button 
            onClick={() => updateWeek(Math.min(12, currentWeek + 1))}
            disabled={currentWeek === 12}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            Next Week
          </button>
        </div>
      </div>
    );
  };

  // Settings Screen Component
  const SettingsScreen = () => {
    const categories = [
      { id: 'general', name: 'General', icon: Settings },
      { id: 'notifications', name: 'Notifications', icon: Clock },
      { id: 'exercise', name: 'Exercise', icon: Zap },
      { id: 'accessibility', name: 'Accessibility', icon: Heart }
    ];

    const renderGeneralSettings = () => (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          <input
            type="text"
            value={userProfile.name}
            onChange={(e) => updateUserProfile({ name: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your display name"
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800">Sound Effects</h4>
              <p className="text-sm text-gray-600">Play sounds during sessions</p>
            </div>
            <button
              onClick={() => updateSettings('general', 'soundEnabled', !userProfile.preferences.soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userProfile.preferences.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                userProfile.preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
          <div className="space-y-2">
            {['light', 'dark', 'auto'].map(theme => (
              <button
                key={theme}
                onClick={() => updateSettings('general', 'theme', theme)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  userProfile.preferences.theme === theme 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-800 capitalize">{theme}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    const renderNotificationSettings = () => (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-800">Daily Reminders</h4>
              <p className="text-sm text-gray-600">Get reminded to do your daily session</p>
            </div>
            <button
              onClick={() => updateSettings('notifications', 'notifications', !userProfile.preferences.notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userProfile.preferences.notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                userProfile.preferences.notifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          {userProfile.preferences.notifications && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Time</label>
              <input
                type="time"
                value={userProfile.preferences.reminderTime}
                onChange={(e) => updateSettings('notifications', 'reminderTime', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Enable Browser Notifications</h4>
              <p className="text-sm text-yellow-700 mt-1">
                To receive reminders, please allow notifications when prompted by your browser.
              </p>
              <button
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission();
                  }
                }}
                className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    const renderExerciseSettings = () => (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Exercise Type</label>
          <div className="space-y-2">
            {[
              { id: 'mixed', name: 'Mixed (Recommended)', desc: 'Variety of movement types' },
              { id: 'cardio', name: 'Cardio Focus', desc: 'Emphasize cardiovascular exercise' },
              { id: 'strength', name: 'Strength Focus', desc: 'Emphasize bodyweight strength' },
              { id: 'mindful', name: 'Mindful Movement', desc: 'Yoga, tai chi, gentle movement' },
              { id: 'dance', name: 'Dance & Rhythm', desc: 'Dance tutorials and rhythmic movement' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => updateSettings('exercise', 'exerciseType', type.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  userProfile.preferences.exerciseType === type.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-800">{type.name}</div>
                <div className="text-sm text-gray-600">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">ADHD Exercise Research</h4>
              <p className="text-sm text-blue-700 mt-1">
                Open-skill activities (like dancing or martial arts) show 119% greater effectiveness 
                than traditional cardio for ADHD attention symptoms.
              </p>
            </div>
          </div>
        </div>
      </div>
    );

    const renderAccessibilitySettings = () => (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h4 className="font-medium text-gray-800 mb-4">Visual Preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">High Contrast Mode</div>
                <div className="text-sm text-gray-600">Increase text and button contrast</div>
              </div>
              <button
                onClick={() => updateSettings('accessibility', 'highContrast', !userProfile.preferences.highContrast)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  userProfile.preferences.highContrast ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userProfile.preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">Reduce Motion</div>
                <div className="text-sm text-gray-600">Minimize animations and transitions</div>
              </div>
              <button
                onClick={() => updateSettings('accessibility', 'reduceMotion', !userProfile.preferences.reduceMotion)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  userProfile.preferences.reduceMotion ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userProfile.preferences.reduceMotion ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h4 className="font-medium text-gray-800 mb-4">Session Modifications</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">Extended Break Times</div>
                <div className="text-sm text-gray-600">Add extra time between activities</div>
              </div>
              <button
                onClick={() => updateSettings('accessibility', 'extendedBreaks', !userProfile.preferences.extendedBreaks)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  userProfile.preferences.extendedBreaks ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userProfile.preferences.extendedBreaks ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">Skip Complex Activities</div>
                <div className="text-sm text-gray-600">Avoid multi-step coordination exercises</div>
              </div>
              <button
                onClick={() => updateSettings('accessibility', 'skipComplex', !userProfile.preferences.skipComplex)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  userProfile.preferences.skipComplex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userProfile.preferences.skipComplex ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    const renderSettingsContent = () => {
      switch(settingsCategory) {
        case 'general': return renderGeneralSettings();
        case 'notifications': return renderNotificationSettings();
        case 'exercise': return renderExerciseSettings();
        case 'accessibility': return renderAccessibilitySettings();
        default: return renderGeneralSettings();
      }
    };

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => {
            soundEffects.navigation();
            setShowSettings(false);
          }}>
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-light text-gray-800">Settings</h2>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => {
                soundEffects.click();
                setSettingsCategory(category.id);
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                settingsCategory === category.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <category.icon className="w-4 h-4 mx-auto mb-1" />
              <div className="hidden sm:block">{category.name}</div>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div>
          {renderSettingsContent()}
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h4 className="font-medium text-gray-800 mb-4">Data & Privacy</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Anonymous User ID</span>
              <span className="text-gray-500 font-mono text-xs">{userProfile.userId.slice(-8)}...</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Data Storage</span>
              <span className="text-gray-500">Local Device Only</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600">
                Your progress is stored locally on your device. No personal data is sent to servers. 
                You can use the app completely anonymously while tracking your full 12-week journey.
              </p>
            </div>
          </div>
        </div>

        {/* Reset Options */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h4 className="font-medium text-gray-800 mb-4">Reset Options</h4>
          <div className="space-y-3">
            <button
              onClick={() => {
                if (confirm('Reset all settings to defaults? Your progress will be kept.')) {
                  setUserProfile(prev => ({
                    ...prev,
                    preferences: {
                      notifications: true,
                      exerciseType: 'mixed',
                      reminderTime: '09:00',
                      soundEnabled: true,
                      theme: 'light',
                      highContrast: false,
                      reduceMotion: false,
                      extendedBreaks: false,
                      skipComplex: false
                    }
                  }));
                }
              }}
              className="w-full text-left p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <div className="font-medium text-orange-800">Reset Settings</div>
              <div className="text-sm text-orange-600">Restore default preferences</div>
            </button>
            
            <button
              onClick={() => {
                if (confirm('Are you sure? This will delete ALL your progress and start over. This cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full text-left p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <div className="font-medium text-red-800">Reset All Data</div>
              <div className="text-sm text-red-600">Delete all progress and start over</div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Profile Screen Component
  const ProfileScreen = () => {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-light text-gray-800 text-center mb-6">Profile</h2>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800">{userProfile.name}</h3>
            <p className="text-sm text-gray-600">Focus & Flow Journey</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Program Started</span>
              <span className="text-gray-600">{userProfile.startDate}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Current Day</span>
              <span className="text-blue-600 font-semibold">{getDayOfWeek()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Current Week</span>
              <span className="text-blue-600 font-semibold">{userProfile.currentWeek}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Sessions Completed</span>
              <span className="text-green-600 font-semibold">{completedSessions.size}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h4 className="font-semibold text-gray-800 mb-4">Quick Actions</h4>
          <div className="space-y-3">
            <button 
              onClick={() => {
                soundEffects.navigation();
                setShowSettings(true);
              }}
              className="w-full text-left p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-gray-500" />
                <span>Settings & Preferences</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                <span>Export Progress Data</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Heart className="w-5 h-5 text-gray-500" />
                <span>Share Your Success</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Anonymous Usage Info */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-800 mb-2">Anonymous & Private</h4>
              <p className="text-sm text-green-700 mb-3">
                Your journey is tracked locally on your device. No account required, no data sent to servers.
              </p>
              <div className="space-y-2 text-xs text-green-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>All progress saved locally</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Works completely offline</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>No personal data collected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Complete Screen Component
  const CompleteScreen = () => {
    return (
      <div className="p-6 h-screen flex flex-col justify-center items-center text-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-light text-gray-800 mb-3">Session Complete!</h2>
        <p className="text-gray-600 mb-8 px-4">
          Great work! You've completed another step in your Focus & Flow journey.
        </p>
        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={() => {
              soundEffects.navigation();
              setCurrentScreen('home');
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-colors"
          >
            Back to Home
          </button>
          <button 
            onClick={() => {
              soundEffects.navigation();
              setCurrentScreen('progress');
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium transition-colors"
          >
            View Progress
          </button>
        </div>
      </div>
    );
  };

  // Bottom Navigation Component
  const BottomNav = () => {
    const navItems = [
      { id: 'home', icon: Home, label: 'Home' },
      { id: 'progress', icon: BarChart3, label: 'Progress' },
      { id: 'profile', icon: User, label: 'Profile' }
    ];

    return (
      <div className="border-t bg-white px-6 py-4 safe-area-inset-bottom">
        <div className="flex justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                soundEffects.navigation();
                setCurrentScreen(item.id);
              }}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                currentScreen === item.id ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Main render function
  const renderScreen = () => {
    if (showSettings) return <SettingsScreen />;
    
    switch(currentScreen) {
      case 'home': return <HomeScreen />;
      case 'session': return <SessionScreen />;
      case 'progress': return <ProgressScreen />;
      case 'profile': return <ProfileScreen />;
      case 'complete': return <CompleteScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col safe-area-inset">
      <div className="flex-1 overflow-auto">
        {renderScreen()}
      </div>
      {(currentScreen !== 'session' && currentScreen !== 'complete' && !showSettings) && <BottomNav />}
    </div>
  );
};

export default App;
