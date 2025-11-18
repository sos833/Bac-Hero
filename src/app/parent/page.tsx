"use client";
import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function ParentLoginPage() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (code.trim().length !== 4) {
            setError('الرجاء إدخال رمز مكون من 4 خانات.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where("parentalCode", "==", code.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('الرمز غير صحيح. يرجى التحقق من الرمز والمحاولة مرة أخرى.');
                setIsLoading(false);
            } else {
                const studentDoc = querySnapshot.docs[0];
                router.push(`/parent/${studentDoc.id}`);
            }
        } catch (err) {
            console.error("Error searching for code:", err);
            setError('حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
            height: '100vh', padding: '20px', background: 'linear-gradient(135deg, #0d0f2b 0%, #0a0b1e 100%)',
            color: 'white', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            <div className="logo" style={{ textAlign: 'center', marginBottom: '40px' }}>
                <i className="fas fa-brain logo-icon" style={{ fontSize: '3rem' }}></i>
                <h1 style={{ fontSize: '2rem' }}>لوحة المتابعة الأبوية</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>أدخل رمز الطالب لعرض تقدمه</p>
            </div>
            
            <div style={{
                background: 'var(--card-bg)', backdropFilter: 'blur(12px)', borderRadius: '20px', 
                padding: '40px', border: '1px solid var(--card-border)', width: '100%', maxWidth: '400px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="parent-code" style={{textAlign: 'center', marginBottom: '15px'}}>رمز الدخول</label>
                        <input
                            type="text"
                            id="parent-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength={4}
                            className="form-input"
                            placeholder="----"
                            required
                            style={{ 
                                fontSize: '2.5rem', 
                                textAlign: 'center', 
                                letterSpacing: '0.5rem', 
                                textTransform: 'uppercase',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>
                    {error && <p style={{ color: '#ff6b6b', textAlign: 'center', margin: '15px 0' }}>{error}</p>}
                    <button type="submit" className="save-btn" disabled={isLoading}>
                        {isLoading ? '...جاري الدخول' : 'عرض التقدم'}
                    </button>
                </form>
            </div>
             <div className="sidebar-footer" style={{ position: 'absolute', bottom: '20px' }}>
                <p>Bac Hero - Cloud</p>
            </div>
        </div>
    );
}
