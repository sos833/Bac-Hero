"use client";

import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function ParentDashboard({ params }: { params: { studentId: string } }) {
    const { firestore } = useFirebase();
    const studentId = params.studentId;

    const userSettingsRef = useMemoFirebase(() => studentId ? doc(firestore, 'users', studentId) : null, [firestore, studentId]);
    const { data: userSettings, isLoading: isUserLoading } = useDoc(userSettingsRef);
    
    const completedSessionsRef = useMemoFirebase(() => studentId ? collection(firestore, 'users', studentId, 'completedSessions') : null, [firestore, studentId]);
    const { data: completedSessions, isLoading: isSessionsLoading } = useCollection(completedSessionsRef);

    const [subjectChartData, setSubjectChartData] = useState({
        labels: ['لا توجد بيانات'],
        datasets: [{ data: [1], backgroundColor: ['#333'], borderWidth: 0 }]
    });
    
    const [weeklyChartData, setWeeklyChartData] = useState({
        labels: [],
        datasets: [{ label: 'دقائق المذاكرة', data: [] }]
    });

    const [statsSummary, setStatsSummary] = useState({
        totalHours: 0,
        totalSessions: 0,
        mostStudied: 'لا توجد'
    });

    useEffect(() => {
        if (completedSessions) {
            updateAnalytics(completedSessions);
        }
    }, [completedSessions]);

    const updateAnalytics = (sessions) => {
        // Subject Chart
        const subjectData = sessions.reduce((acc, s) => {
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
        }

        // Weekly Chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        }).reverse();

        const labels = last7Days.map(d => d.toLocaleDateString('ar-DZ', { weekday: 'short' }));
        const data = last7Days.map(d => 
            sessions
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
        const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
        const mostStudied = Object.keys(subjectData).length > 0
            ? Object.keys(subjectData).reduce((a, b) => subjectData[a] > subjectData[b] ? a : b)
            : 'لا توجد';

        setStatsSummary({
            totalHours: totalMinutes / 60,
            totalSessions: sessions.length,
            mostStudied: mostStudied
        });
    };

    if (isUserLoading || isSessionsLoading) {
        return <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            background: 'linear-gradient(135deg, #0d0f2b 0%, #0a0b1e 100%)', color: 'white', flexDirection: 'column', fontFamily: 'Segoe UI'
        }}>
            <h1 style={{fontSize: '2rem'}}>...جاري تحميل بيانات الطالب</h1>
        </div>
    }

    if (!userSettings) {
         return <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            background: 'linear-gradient(135deg, #0d0f2b 0%, #0a0b1e 100%)', color: 'white', flexDirection: 'column', fontFamily: 'Segoe UI'
        }}>
            <h1 style={{fontSize: '2rem'}}>لم يتم العثور على الطالب</h1>
            <p style={{marginTop: '1rem', color: '#ccc'}}>الرجاء التأكد من صحة الرابط أو الرمز.</p>
        </div>
    }

    return (
        <div className="main-content" style={{ margin: 0, width: '100vw', minHeight: '100vh', padding: '40px'}}>
             <div id="analytics" className="section active">
                <h2 className="section-title" style={{fontSize: '2.5rem'}}>
                    لوحة متابعة الطالب
                </h2>
                <p style={{textAlign: 'center', color: '#ccc', marginBottom: '40px'}}>
                    عرض تحليلات وتقدم الطالب في المذاكرة
                </p>

                <div className="stats-summary" style={{marginBottom: '40px'}}>
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

                <div className="analytics-grid">
                    <div className="chart-container">
                        <h3 className="chart-title">توزيع المواد</h3>
                        <Doughnut data={subjectChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'white', padding: 15, font: { size: 14 } } } } }} />
                    </div>
                    <div className="chart-container">
                        <h3 className="chart-title">التقدم الأسبوعي (آخر 7 أيام)</h3>
                        <Bar 
                            data={weeklyChartData} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { legend: { display: false } }, 
                                scales: { 
                                    y: { beginAtZero: true, ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }, 
                                    x: { ticks: { color: 'white' }, grid: { display: false } } 
                                } 
                            }} 
                        />
                    </div>
                </div>
            </div>
             <div className="sidebar-footer" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                <p>Bac Hero - Cloud</p>
            </div>
        </div>
    );
}
