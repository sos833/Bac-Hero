"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useUser, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { collection, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const quotes = [
    "النجاح هو نتيجة التحضير والعمل الجاد واستخلاص الدروس من الفشل.",
    "لا تؤجل عمل اليوم إلى الغد، فالنجاح يحتاج إلى عمل مستمر.",
    "المعرفة قوة، والتعلم المستمر هو طريق التفوق.",
    "كل دقيقة تقضيها في التعلم تقربك خطوة من أهدافك.",
    "الصبر والمثابرة مفتاحا النجاح في البكالوريا.",
    "اجعل من كل يوم فرصة للتقدم نحو هدفك.",
    "التفوق ليس حدثاً، بل عادة يومية.",
    "استثمر في نفسك، فهو أفضل استثمار يمكنك القيام به.",
    "لا تخف من الفشل، بل اخشَ ألا تحاول.",
    "كل إنجاز عظيم كان في البداية مجرد حلم.",
];

const daysOfWeek = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const dayMap = { 'Sunday': 'الأحد', 'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت' };

const musicTracks = [
    { name: 'Inspiring Cinematic', url: 'https://assets.mixkit.co/music/292/292.mp3' },
    { name: 'As The Light Fades', url: 'https://cdn.pixabay.com/audio/2023/11/13/audio_133d124575.mp3' },
    { name: 'Apathy (Slowed)', url: 'https://cdn.pixabay.com/audio/2024/05/13/audio_7cc1e69569.mp3' },
    { name: 'Watching the Stars', url: 'https://cdn.pixabay.com/audio/2024/01/06/audio_63b66c2c72.mp3' },
];

export default function Home() {
    const { auth, firestore } = useFirebase();
    const { user, isUserLoading } = useUser();

    const [activeSection, setActiveSection] = useState('dashboard');
    const [motivationalQuote, setMotivationalQuote] = useState(quotes[0]);
    const [liveClock, setLiveClock] = useState('');
    const [dailyGoal, setDailyGoal] = useState(180);
    const [shutdownFeature, setShutdownFeature] = useState(false);
        
    const [todayStudyTime, setTodayStudyTime] = useState(0);
    const [todayCompletedSessions, setTodayCompletedSessions] = useState(0);
    const [dailyProgress, setDailyProgress] = useState(0);
    const [progressText, setProgressText] = useState('');

    const [nextSession, setNextSession] = useState(null);
    const [currentSession, setCurrentSession] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTasks, setModalTasks] = useState([]);
    const [currentTask, setCurrentTask] = useState('');

    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isStrictFocus, setIsStrictFocus] = useState(false);
    const [isTimerPaused, setIsTimerPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const [isMusicListOpen, setIsMusicListOpen] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const audioRef = useRef(null);
    
    const notifiedSessionsRef = useRef(new Set());
    const timerRef = useRef(null);
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalContent, setConfirmModalContent] = useState({ title: '', message: '', onConfirm: () => {} });
    const [toasts, setToasts] = useState([]);

    const focusSessionStartTimeRef = useRef(0);
    const focusSessionDurationRef = useRef(0);
    const pauseStartTimeRef = useRef(0);
    const totalPausedTimeRef = useRef(0);

    // Firestore collections refs
    const plannedSessionsRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'plannedSessions') : null, [firestore, user]);
    const completedSessionsRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'completedSessions') : null, [firestore, user]);
    const settingsRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);

    const { data: plannedSessions = [] } = useCollection(plannedSessionsRef);
    const { data: completedSessions = [] } = useCollection(completedSessionsRef);
     
    const [subjectChartData, setSubjectChartData] = useState({
        labels: ['لا توجد بيانات'],
        datasets: [{
            data: [1],
            backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#9b59b6', '#3498db', '#2ecc71'],
            borderWidth: 0
        }]
    });
    
    const [weeklyChartData, setWeeklyChartData] = useState({
        labels: [],
        datasets: [{
            label: 'دقائق المذاكرة',
            data: [],
            backgroundColor: 'rgba(0, 240, 255, 0.6)',
            borderColor: 'rgba(0, 240, 255, 1)',
            borderWidth: 2,
            borderRadius: 5
        }]
    });

    const [statsSummary, setStatsSummary] = useState({
        totalHours: 0,
        totalSessions: 0,
        mostStudied: 'لا توجد'
    });
    const [expandedSession, setExpandedSession] = useState(null);

    // Sign in anonymously if not logged in
    useEffect(() => {
        if (!isUserLoading && !user) {
            initiateAnonymousSignIn(auth);
        }
    }, [isUserLoading, user, auth]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMotivationalQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const clockInterval = setInterval(() => {
            const now = new Date();
            setLiveClock(now.toLocaleTimeString('ar-DZ', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }));
            checkUpcomingSessions(now);
        }, 1000);
        return () => clearInterval(clockInterval);
    }, [plannedSessions]);
    
    useEffect(() => {
        if (user && settingsRef) {
            setDocumentNonBlocking(settingsRef, { dailyGoal, shutdownFeature }, { merge: true });
        }
        updateDashboardStats();
    }, [dailyGoal, shutdownFeature, completedSessions, user, settingsRef]);

    useEffect(() => {
        updateNextSessionInternal();
    }, [plannedSessions]);

    useEffect(() => {
        updateDashboardStats();
        updateAnalytics();
    }, [completedSessions]);
    
    useEffect(() => {
        updateDashboardStats();
        updateAnalytics();
        updateNextSessionInternal();
    }, [plannedSessions, completedSessions]);

    useEffect(() => {
        if (isFocusMode && !isTimerPaused && currentSession) {
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = now - focusSessionStartTimeRef.current - totalPausedTimeRef.current;
                const remaining = Math.max(0, focusSessionDurationRef.current - elapsed);
                const actualTimeLeft = Math.ceil(remaining / 1000);

                setTimeLeft(actualTimeLeft);

                if (actualTimeLeft <= 0) {
                    completeSession(currentSession.duration);
                    endFocusSession();
                }
            }, 100);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isFocusMode, isTimerPaused, currentSession]);

     useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isFocusMode && isStrictFocus) {
                event.preventDefault();
                event.returnValue = 'هل أنت متأكد من رغبتك في المغادرة؟ سيتم إنهاء جلسة التركيز.';
            }
        };

        const handleVisibilityChange = () => {
            if (isFocusMode && isStrictFocus && document.hidden) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
                showToast('التركيز أولاً! تم منع تبديل التبويب.', 'error');
            }
        };

        if (isFocusMode && isStrictFocus) {
            window.addEventListener('beforeunload', handleBeforeUnload);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isFocusMode, isStrictFocus]);

    const sendNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, { 
                body,
                icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>',
            });
            notification.onclick = () => {
                window.focus();
            };
        }
    };

    const checkUpcomingSessions = (now) => {
        const currentDayName = dayMap[now.toLocaleString('en-US', { weekday: 'long' })];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        plannedSessions.forEach(session => {
            const notificationId = `${session.day}-${session.time}`;
            if (session.day === currentDayName && session.time === currentTime && !notifiedSessionsRef.current.has(notificationId)) {
                sendNotification(
                    'حان وقت المذاكرة!',
                    `جلستك لمادة "${session.subject}" ستبدأ الآن.`
                );
                notifiedSessionsRef.current.add(notificationId);
                 if (currentTime === "00:00") {
                    notifiedSessionsRef.current.clear();
                }
            }
        });
    };
    
    // ================== Functions ==================
        
    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const openConfirmModal = (title, message, onConfirm) => {
        setConfirmModalContent({ title, message, onConfirm });
        setIsConfirmModalOpen(true);
    };

    const handleConfirm = () => {
        confirmModalContent.onConfirm();
        setIsConfirmModalOpen(false);
    };

    const handleCancel = () => {
        setIsConfirmModalOpen(false);
    };
    
    const updateDashboardStats = () => {
        const today = new Date().toDateString();
        const todaySessions = completedSessions.filter(s => new Date(s.date).toDateString() === today);
        const totalMinutesToday = todaySessions.reduce((sum, s) => sum + s.duration, 0);

        setTodayStudyTime(totalMinutesToday);
        setTodayCompletedSessions(todaySessions.length);
        
        const progressPercentage = dailyGoal > 0 ? Math.min((totalMinutesToday / dailyGoal) * 100, 100) : 0;
        setDailyProgress(progressPercentage);
        setProgressText(`${totalMinutesToday} / ${dailyGoal} دقيقة (${Math.round(progressPercentage)}%)`);
        
        updateNextSessionInternal();
    };

    const updateNextSessionInternal = () => {
        const now = new Date();
        const currentDayName = dayMap[now.toLocaleString('en-US', { weekday: 'long' })];
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const upcomingSessions = plannedSessions
            .filter(s => {
                const dayIndex = daysOfWeek.indexOf(s.day);
                const currentDayIndex = now.getDay() === 6 ? 0 : now.getDay() + 1; // Adjust for Saturday start
                if (dayIndex < currentDayIndex) return false;
                if (dayIndex > currentDayIndex) return true;
                const [h, m] = s.time.split(':');
                return (parseInt(h) * 60 + parseInt(m)) >= currentTime;
            })
            .sort((a, b) => {
                const dayCompare = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
                if (dayCompare !== 0) return dayCompare;
                return a.time.localeCompare(b.time);
            });

        setNextSession(upcomingSessions[0] || null);
    };
    
    const formatTime12h = (time24) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      let h = parseInt(hours, 10);
      const suffix = h >= 12 ? 'م' : 'ص';
      h = ((h + 11) % 12 + 1);
      return `${String(h).padStart(2, '0')}:${minutes} ${suffix}`;
    };

    const handleAddTask = () => {
        if (currentTask.trim() === '') return;
        setModalTasks([...modalTasks, { id: Date.now(), text: currentTask, completed: false }]);
        setCurrentTask('');
    };

    const handleRemoveTask = (taskId) => {
        setModalTasks(modalTasks.filter(task => task.id !== taskId));
    };

    const handleAddSession = (e) => {
        e.preventDefault();
        if (!plannedSessionsRef) return;
        const form = e.target;
        const newSession = {
            day: form.day.value,
            subject: form.subject.value,
            time: form.time.value,
            duration: parseInt(form.duration.value),
            tasks: modalTasks,
        };
        addDocumentNonBlocking(plannedSessionsRef, newSession);
        setModalTasks([]);
        setIsModalOpen(false);
        showToast('تمت إضافة الجلسة بنجاح.', 'success');
    };

    const handleDeleteSession = (sessionId) => {
         openConfirmModal(
            'حذف الجلسة',
            'هل أنت متأكد من رغبتك في حذف هذه الجلسة؟',
            () => {
                if (!user) return;
                const docRef = doc(firestore, 'users', user.uid, 'plannedSessions', sessionId);
                deleteDocumentNonBlocking(docRef);
                showToast('تم حذف الجلسة بنجاح.', 'success');
            }
        );
    };

    const handleToggleTask = (sessionId, taskId, isCompleted) => {
        if (!user) return;
        const session = plannedSessions.find(s => s.id === sessionId);
        if (!session) return;

        const updatedTasks = session.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !isCompleted } : task
        );
        
        const sessionDocRef = doc(firestore, 'users', user.uid, 'plannedSessions', sessionId);
        updateDocumentNonBlocking(sessionDocRef, { tasks: updatedTasks });
    };

    const startFocusSession = () => {
        const sessionToStart = currentSession || nextSession;
        if (!sessionToStart) {
            showToast('يرجى تحديد جلسة أو التأكد من وجود جلسة قادمة.', 'error');
            return;
        }

        setCurrentSession(sessionToStart);
        
        focusSessionDurationRef.current = sessionToStart.duration * 60 * 1000;
        setTimeLeft(sessionToStart.duration * 60);

        focusSessionStartTimeRef.current = Date.now();
        totalPausedTimeRef.current = 0;
        pauseStartTimeRef.current = 0;
        
        setIsTimerPaused(false);
        setIsFocusMode(true);
    };
    
    const completeSession = (durationInMinutes) => {
        if (!currentSession || !completedSessionsRef) return;
        const newCompleted = {
            subject: currentSession.subject,
            duration: durationInMinutes,
            date: new Date().toISOString()
        };
        addDocumentNonBlocking(completedSessionsRef, newCompleted);
        sendNotification('أحسنت!', `أكملت ${durationInMinutes} دقيقة من مذاكرة ${currentSession.subject}.`);
        showToast(`أحسنت! تم حفظ ${durationInMinutes} دقيقة.`, 'success');
    };

    const endFocusSession = () => {
        clearInterval(timerRef.current);
        setIsFocusMode(false);
        if (isStrictFocus) {
            setIsStrictFocus(false);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
        setCurrentSession(null);
        if (audioRef.current) {
            audioRef.current.pause();
            setCurrentTrack(null);
        }
    };
    
    const stopTimer = () => {
        openConfirmModal(
            'إنهاء الجلسة',
            'هل أنت متأكد من رغبتك في إنهاء الجلسة؟ سيتم حفظ التقدم المحرز.',
            () => {
                const elapsed = Date.now() - focusSessionStartTimeRef.current - totalPausedTimeRef.current;
                const minutesCompleted = Math.floor(elapsed / (1000 * 60));
                
                if (minutesCompleted > 0) {
                    completeSession(minutesCompleted);
                } else {
                    showToast('لم يتم حفظ أي تقدم لأن مدة الجلسة كانت أقل من دقيقة.', 'info');
                }
                
                endFocusSession();
            }
        );
    };

    const togglePauseTimer = () => {
        setIsTimerPaused(paused => {
            if (paused) {
                // Resuming
                const pausedDuration = Date.now() - pauseStartTimeRef.current;
                totalPausedTimeRef.current += pausedDuration;
                if(audioRef.current) audioRef.current.play().catch(e => console.error("Audio play failed on resume", e));
            } else {
                // Pausing
                pauseStartTimeRef.current = Date.now();
                if(audioRef.current) audioRef.current.pause();
            }
            return !paused;
        });
    };
    
    const toggleStrictFocus = () => {
        setIsStrictFocus(isStrict => {
            const newStrictState = !isStrict;
            if (newStrictState) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    showToast('لم يتمكن المتصفح من الدخول في وضع ملء الشاشة.', 'error');
                });
                showToast('تم تفعيل قفل التركيز.', 'info');
            } else {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                showToast('تم إلغاء تفعيل قفل التركيز.', 'info');
            }
            return newStrictState;
        });
    };

    const playTrack = (track) => {
        setCurrentTrack(track);
        setIsMusicListOpen(false);
    };

    useEffect(() => {
        if (audioRef.current) {
            if (currentTrack) {
                audioRef.current.src = currentTrack.url;
                audioRef.current.play().catch(e => console.error("Audio play failed", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [currentTrack]);
    
    const selectSession = (session) => {
        setCurrentSession(session);
        setActiveSection('dashboard');
        showToast(`تم تحديد جلسة: ${session.subject}`);
    };

    const updateAnalytics = () => {
        const completed = completedSessions || [];

        // Subject Chart
        const subjectData = completed.reduce((acc, s) => {
            acc[s.subject] = (acc[s.subject] || 0) + s.duration;
            return acc;
        }, {});
        
        if (Object.keys(subjectData).length > 0) {
            setSubjectChartData({
                labels: Object.keys(subjectData),
                datasets: [{
                    data: Object.values(subjectData),
                    backgroundColor: ['#ff00f0', '#00f0ff', '#45b7d1', '#feca57', '#9b59b6', '#3498db', '#2ecc71'],
                    borderWidth: 0
                }]
            });
        } else {
             setSubjectChartData({
                labels: ['لا توجد بيانات'],
                datasets: [{ data: [1], backgroundColor: ['#333'], borderWidth: 0 }]
            });
        }
        
        // Weekly Chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        }).reverse();

        const labels = last7Days.map(d => d.toLocaleDateString('ar-DZ', { weekday: 'short' }));
        const data = last7Days.map(d => 
            completed
                .filter(s => new Date(s.date).toDateString() === d.toDateString())
                .reduce((sum, s) => sum + s.duration, 0)
        );

        setWeeklyChartData({
            labels,
            datasets: [{
                label: 'دقائق المذاكرة',
                data,
                backgroundColor: 'rgba(0, 240, 255, 0.6)',
                borderColor: 'rgba(0, 240, 255, 1)',
                borderWidth: 2,
                borderRadius: 5
            }]
        });

        // Stats Summary
        const totalMinutes = completed.reduce((sum, s) => sum + s.duration, 0);
        const mostStudied = Object.keys(subjectData).length > 0
            ? Object.keys(subjectData).reduce((a, b) => subjectData[a] > subjectData[b] ? a : b)
            : 'لا توجد';

        setStatsSummary({
            totalHours: totalMinutes / 60,
            totalSessions: completed.length,
            mostStudied: mostStudied
        });
    };
    
    const openExamsBank = () => {
         openConfirmModal(
            'الانتقال لموقع خارجي',
            'سيتم نقلك إلى موقع بنك الاختبارات الخارجي (dzexams.com). هل تريد المتابعة؟',
            () => window.open('https://www.dzexams.com/ar/bac', '_blank')
        );
    };
    
    const openSubjectExams = (subject) => {
        const subjectLinks = {
            'math': { name: 'الرياضيات', url: 'https://www.dzexams.com/ar/bac/mathematiques' },
            'physics': { name: 'الفيزياء', url: 'https://www.dzexams.com/ar/bac/physique' },
            'chemistry': { name: 'الكيمياء', url: 'https://www.dzexams.com/ar/bac/physique' },
            'biology': { name: 'علوم الطبيعة والحياة', url: 'https://www.dzexams.com/ar/bac/sciences-naturelles' },
            'history': { name: 'التاريخ والجغرافيا', url: 'https://www.dzexams.com/ar/bac/histoire-geographie' },
            'arabic': { name: 'اللغة العربية وآدابها', url: 'https://www.dzexams.com/ar/bac/arabe' },
            'languages': { name: 'اللغات الأجنبية', url: 'https://www.dzexams.com/ar/bac/francais' },
            'philosophy': { name: 'الفلسفة', url: 'https://www.dzexams.com/ar/bac/philosophie' }
        };
        const subjectInfo = subjectLinks[subject];
        if (subjectInfo) {
            openConfirmModal(
                `اختبارات ${subjectInfo.name}`,
                `سيتم نقلك إلى صفحة اختبارات مادة "${subjectInfo.name}". هل تريد المتابعة؟`,
                () => window.open(subjectInfo.url, '_blank')
            );
        }
    };
    
    if (isUserLoading) {
        return <div className="loading-screen">
            <div className="logo">
                <i className="fas fa-brain logo-icon"></i>
                <h1>Bac Hero</h1>
                <p>...جاري التحميل</p>
            </div>
        </div>
    }

    return (
        <>
             <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.message}
                    </div>
                ))}
            </div>

            <div className="sidebar">
                <div className="logo">
                    <i className="fas fa-brain logo-icon"></i>
                    <h1>Bac Hero</h1>
                </div>
                <ul className="nav-menu">
                    <li className="nav-item">
                        <a href="#" className={`nav-link ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
                            <i className="fas fa-home"></i>
                            <span>اللوحة الرئيسية</span>
                        </a>
                    </li>
                    <li className="nav-item">
                        <a href="#" className={`nav-link ${activeSection === 'planner' ? 'active' : ''}`} onClick={() => setActiveSection('planner')}>
                            <i className="fas fa-calendar-alt"></i>
                            <span>المخطط الأسبوعي</span>
                        </a>
                    </li>
                    <li className="nav-item">
                        <a href="#" className={`nav-link ${activeSection === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveSection('analytics'); updateAnalytics(); }}>
                            <i className="fas fa-chart-line"></i>
                            <span>التحليلات</span>
                        </a>
                    </li>
                    <li className="nav-item">
                        <a href="#" className={`nav-link ${activeSection === 'exams' ? 'active' : ''}`} onClick={() => setActiveSection('exams')}>
                            <i className="fas fa-file-alt"></i>
                            <span>بنك الاختبارات</span>
                        </a>
                    </li>
                </ul>
                <div className="sidebar-footer">
                    <p>v2.0.0 - Cloud</p>
                </div>
            </div>

            <main className="main-content">
                {activeSection === 'dashboard' && (
                    <div id="dashboard" className="section active">
                        <div className="dashboard-header">
                            <h1 className="welcome-title">أهلاً بك مجدداً يا بطل!</h1>
                            <div className="live-clock">{liveClock}</div>
                        </div>
                        <div className="quote-card">
                            <p className="quote-text">{motivationalQuote}</p>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon study-time"><i className="fas fa-clock"></i></div>
                                <div className="stat-value">{todayStudyTime}</div>
                                <div className="stat-label">دقيقة من المذاكرة اليوم</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon completed-sessions"><i className="fas fa-check-circle"></i></div>
                                <div className="stat-value">{todayCompletedSessions}</div>
                                <div className="stat-label">جلسات مكتملة اليوم</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon focus-rate"><i className="fas fa-crosshairs"></i></div>
                                <div className="stat-value">--%</div>
                                <div className="stat-label">معدل التركيز (قريباً)</div>
                            </div>
                        </div>

                        <div className="progress-section">
                            <div className="progress-header">
                                <h3 className="progress-title">تقدم الهدف اليومي</h3>
                                <div className="goal-setter">
                                    <span>الهدف:</span>
                                    <input type="number" className="goal-input" value={dailyGoal} onChange={e => setDailyGoal(parseInt(e.target.value) || 0)} min="0" max="600" />
                                    <span>دقيقة</span>
                                </div>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${dailyProgress}%` }}></div>
                            </div>
                            <div className="progress-text">{progressText}</div>
                        </div>

                        <div className="quick-start">
                            <h3>البدء السريع</h3>
                            <div className="next-session">
                                {currentSession ? <span>المحددة: <strong>{currentSession.subject}</strong> - {formatTime12h(currentSession.time)} ({currentSession.duration} دقيقة)</span> :
                                 nextSession ? <span>التالية: <strong>{nextSession.subject}</strong> - {formatTime12h(nextSession.time)} ({nextSession.duration} دقيقة)</span> : 'لا توجد جلسات مجدولة'}
                            </div>
                            <div className="settings-card">
                                <div className="checkbox-container">
                                    <input type="checkbox" id="shutdown-feature" className="checkbox" checked={shutdownFeature} onChange={e => setShutdownFeature(e.target.checked)} />
                                    <label htmlFor="shutdown-feature">تفعيل وضع الإغلاق بعد انتهاء الجلسة (قريباً)</label>
                                </div>
                            </div>
                            <button className="start-btn" onClick={startFocusSession}>
                                <i className="fas fa-play"></i> ابدأ جلسة التركيز
                            </button>
                        </div>
                    </div>
                )}
                
                {activeSection === 'planner' && (
                    <div id="planner" className="section active">
                         <div className="planner-header">
                            <h2 className="section-title">المخطط الأسبوعي</h2>
                            <button className="add-session-btn" onClick={() => setIsModalOpen(true)}>
                                <i className="fas fa-plus"></i> <span>إضافة جلسة</span>
                            </button>
                        </div>
                        <div className="weekly-grid">
                            {daysOfWeek.map(day => (
                                <div key={day} className="day-column">
                                    <div className="day-header">{day}</div>
                                    {plannedSessions
                                        .filter(s => s.day === day)
                                        .sort((a, b) => a.time.localeCompare(b.time))
                                        .map(session => {
                                            const completedTasks = session.tasks?.filter(t => t.completed).length || 0;
                                            const totalTasks = session.tasks?.length || 0;
                                            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                                            return (
                                            <div key={session.id} className={`session-item-wrapper ${expandedSession === session.id ? 'expanded' : ''}`}>
                                                <div className="session-item" >
                                                    <div className="session-main-info" onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                                                        <div className="session-details" >
                                                            <div className="session-time">{formatTime12h(session.time)}</div>
                                                            <div className="session-subject">{session.subject}</div>
                                                            <div className="session-duration">{session.duration} دقيقة</div>
                                                        </div>
                                                         <div className="session-actions">
                                                            <button className="select-session-btn" onClick={(e) => { e.stopPropagation(); selectSession(session); }} title="تحديد كجلسة تالية">
                                                                <i className="fas fa-bullseye"></i>
                                                            </button>
                                                            <button className="delete-session-btn" onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                     {totalTasks > 0 && (
                                                        <div className="session-task-progress" onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                                                            <div className="task-progress-bar-container">
                                                                <div className="task-progress-bar" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                            <span className="task-progress-text">{completedTasks}/{totalTasks} مهام</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {expandedSession === session.id && (
                                                    <div className="session-task-list">
                                                        {session.tasks && session.tasks.length > 0 ? (
                                                            session.tasks.map(task => (
                                                                <div key={task.id} className="task-item">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`task-${task.id}`}
                                                                        className="task-checkbox"
                                                                        checked={task.completed}
                                                                        onChange={() => handleToggleTask(session.id, task.id, task.completed)}
                                                                    />
                                                                    <label htmlFor={`task-${task.id}`}>{task.text}</label>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="no-tasks-text">لا توجد مهام لهذه الجلسة.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )})
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeSection === 'analytics' && (
                    <div id="analytics" className="section active">
                        <h2 className="section-title">التحليلات والتقدم</h2>
                        <div className="analytics-grid">
                            <div className="chart-container">
                                <h3 className="chart-title">توزيع المواد</h3>
                                <Doughnut data={subjectChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'white', padding: 15, font: { size: 14 } } } } }} />
                            </div>
                            <div className="chart-container">
                                <h3 className="chart-title">التقدم الأسبوعي</h3>
                                <Bar 
                                    data={weeklyChartData} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false, 
                                        plugins: { 
                                            legend: { display: false } 
                                        }, 
                                        scales: { 
                                            y: { 
                                                beginAtZero: true, 
                                                ticks: { color: 'white' }, 
                                                grid: { color: 'rgba(255,255,255,0.1)' } 
                                            }, 
                                            x: { 
                                                ticks: { color: 'white' }, 
                                                grid: { display: false } 
                                            } 
                                        } 
                                    }} 
                                />
                            </div>
                        </div>
                        <div className="stats-summary">
                            <div className="summary-card">
                                <div className="stat-icon"><i className="fas fa-graduation-cap"></i></div>
                                <div className="stat-value">{statsSummary.totalHours.toFixed(1)}</div>
                                <div className="stat-label">ساعة إجمالي المذاكرة</div>
                            </div>
                            <div className="summary-card">
                                <div className="stat-icon"><i className="fas fa-trophy"></i></div>
                                <div className="stat-value">{statsSummary.totalSessions}</div>
                                <div className="stat-label">جلسة مكتملة</div>
                            </div>
                            <div className="summary-card">
                                <div className="stat-icon"><i className="fas fa-star"></i></div>
                                <div className="stat-value">{statsSummary.mostStudied}</div>
                                <div className="stat-label">أكثر مادة تمت مراجعتها</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'exams' && (
                     <div id="exams" className="section active">
                        <div className="exams-header">
                            <h2 className="section-title"><i className="fas fa-book-reader"></i> بنك الاختبارات</h2>
                            <p>مجموعة شاملة من الاختبارات والامتحانات لجميع المواد</p>
                        </div>
                        <div className="feature-grid">
                             <div className="feature-card">
                                <div className="feature-icon"><i className="fas fa-book-open"></i></div>
                                <h3>جميع المواد</h3>
                                <p>اختبارات شاملة لجميع مواد البكالوريا</p>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon"><i className="fas fa-layer-group"></i></div>
                                <h3>سنوات متنوعة</h3>
                                <p>اختبارات من السنوات السابقة والحديثة</p>                            </div>
                            <div className="feature-card">
                                <div className="feature-icon"><i className="fas fa-check-double"></i></div>
                                <h3>الحلول النموذجية</h3>
                                <p>إجابات نموذجية وشروحات واضحة</p>
                            </div>
                        </div>
                        <div className="access-card">
                            <div className="access-content">
                                <div className="access-icon"><i className="fas fa-external-link-alt"></i></div>
                                <div className="access-text">
                                    <h3>ادخل إلى بنك الاختبارات</h3>
                                    <p>احصل على آلاف الاختبارات التي ستساعدك في التحضير</p>
                                </div>
                                <button className="access-btn" onClick={openExamsBank}>
                                    <i className="fas fa-rocket"></i> ادخل الآن
                                </button>
                            </div>
                        </div>
                        <div className="subjects-grid">
                            <h3 className="section-subtitle">الوصول السريع للمواد</h3>
                            <div className="subjects-container">
                                <div className="subject-item" onClick={() => openSubjectExams('math')}><i className="fas fa-calculator"></i><span>الرياضيات</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('physics')}><i className="fas fa-atom"></i><span>الفيزياء</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('chemistry')}><i className="fas fa-flask"></i><span>الكيمياء</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('biology')}><i className="fas fa-dna"></i><span>علوم الطبيعة</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('history')}><i className="fas fa-globe-africa"></i><span>التاريخ والجغرافيا</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('arabic')}><i className="fas fa-quran"></i><span>الأدب العربي</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('languages')}><i className="fas fa-language"></i><span>اللغات الأجنبية</span></div>
                                <div className="subject-item" onClick={() => openSubjectExams('philosophy')}><i className="fas fa-brain"></i><span>الفلسفة</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="modal active">
                    <div className="modal-content">
                         <div className="modal-header">
                            <h3 className="modal-title">إضافة جلسة جديدة</h3>
                            <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
                        </div>
                        <form id="session-form" onSubmit={handleAddSession}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="session-day">اليوم:</label>
                                <select id="session-day" name="day" className="form-select" defaultValue="السبت">
                                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="session-subject">اسم المادة:</label>
                                <input type="text" id="session-subject" name="subject" className="form-input" placeholder="مثال: رياضيات، فيزياء..." required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="session-time">وقت البداية:</label>
                                <input type="time" id="session-time" name="time" className="form-input" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="session-duration">المدة (بالدقائق):</label>
                                <input type="number" id="session-duration" name="duration" className="form-input" min="15" max="180" defaultValue="45" required />
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="task-input">مهام الجلسة:</label>
                                <div className="task-input-group">
                                    <input 
                                        type="text" 
                                        id="task-input" 
                                        className="form-input" 
                                        placeholder="اكتب مهمة واضغط إضافة..." 
                                        value={currentTask} 
                                        onChange={(e) => setCurrentTask(e.target.value)}
                                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
                                    />
                                    <button type="button" className="add-task-btn" onClick={handleAddTask}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div className="modal-task-list">
                                    {modalTasks.map(task => (
                                        <div key={task.id} className="modal-task-item">
                                            <span>{task.text}</span>
                                            <button type="button" onClick={() => handleRemoveTask(task.id)}>&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="save-btn">
                                <i className="fas fa-save"></i> حفظ الجلسة
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
             {isFocusMode && (
                <div id="focus-mode" className="active">
                     <div className="focus-left-panel">
                        <div className="music-player-container">
                            <button className="music-btn" onClick={() => setIsMusicListOpen(!isMusicListOpen)}>
                                <i className="fas fa-music"></i>
                            </button>
                            {isMusicListOpen && (
                                <ul className="music-list">
                                    {musicTracks.map(track => (
                                        <li key={track.name} onClick={() => playTrack(track)}>
                                            <i className="fas fa-play-circle"></i>
                                            <span>{track.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="focus-tasks-container">
                             <h3 className="focus-tasks-title">مهام هذه الجلسة</h3>
                            <div className="focus-task-list">
                                {currentSession?.tasks && currentSession.tasks.length > 0 ? (
                                    currentSession.tasks.map(task => (
                                        <div key={task.id} className="task-item">
                                            <input
                                                type="checkbox"
                                                id={`focus-task-${task.id}`}
                                                className="task-checkbox"
                                                checked={task.completed}
                                                onChange={() => handleToggleTask(currentSession.id, task.id, task.completed)}
                                            />
                                            <label htmlFor={`focus-task-${task.id}`}>{task.text}</label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-tasks-text">لا توجد مهام محددة.</p>
                                )}
                            </div>
                        </div>
                    </div>


                    <div className="focus-main-panel">
                        <div className="timer-subject">{currentSession?.subject}</div>
                        <div className="timer-display">{`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}</div>
                        <div className="timer-controls">
                            <button className={`timer-btn lock-btn ${isStrictFocus ? 'active' : ''}`} onClick={toggleStrictFocus} title={isStrictFocus ? 'إلغاء قفل التركيز' : 'تفعيل قفل التركيز'}>
                                <i className={`fas ${isStrictFocus ? 'fa-lock' : 'fa-lock-open'}`}></i>
                            </button>
                            <button className="timer-btn pause-btn" onClick={togglePauseTimer}>
                                <i className={`fas ${isTimerPaused ? 'fa-play' : 'fa-pause'}`}></i> {isTimerPaused ? 'استئناف' : 'إيقاف مؤقت'}
                            </button>
                            <button className="timer-btn stop-btn" onClick={stopTimer}>
                                <i className="fas fa-stop"></i> إنهاء الجلسة
                            </button>
                        </div>
                    </div>
                   

                    {currentTrack && (
                        <div className="audio-player-wrapper">
                             <p>{currentTrack.name}</p>
                             <audio ref={audioRef} controls autoPlay loop>
                                <source src={currentTrack.url} type="audio/mpeg" />
                                متصفحك لا يدعم عنصر الصوت.
                            </audio>
                        </div>
                    )}
                </div>
            )}

            {isConfirmModalOpen && (
                <div className="modal active">
                    <div className="modal-content confirm-modal">
                        <h3 className="modal-title">{confirmModalContent.title}</h3>
                        <p className="confirm-message">{confirmModalContent.message}</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn confirm-btn-yes" onClick={handleConfirm}>نعم</button>
                            <button className="confirm-btn confirm-btn-no" onClick={handleCancel}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
