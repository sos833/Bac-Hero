"use client";
import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function ParentLoginPage() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const [code, setCode] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleInputChange = (e, index) => {
        const newCode = [...code];
        newCode[index] = e.target.value;
        setCode(newCode);

        // Move to next input
        if (e.target.value && index < 3) {
            inputRefs.current[index + 1].focus();
        }
    };
    
    const handleKeyDown = (e, index) => {
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const finalCode = code.join('');
        if (finalCode.length !== 4) {
            setError('الرجاء إدخال الرمز المكون من 4 خانات بالكامل.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where("parentalCode", "==", finalCode.toUpperCase()));
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
    
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 4);
        const newCode = [...code];
        for (let i = 0; i < pastedData.length; i++) {
            if (i < 4) {
                newCode[i] = pastedData[i];
            }
        }
        setCode(newCode);
        if (inputRefs.current[pastedData.length -1]) {
           inputRefs.current[pastedData.length -1].focus();
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
            height: '100vh', background: 'linear-gradient(135deg, #0d0f2b 0%, #0a0b1e 100%)',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            <form className="form" onSubmit={handleLogin} onPaste={handlePaste}>
              <p className="heading">التحقق من الرمز</p>
              <svg className="check" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="60px" height="60px" viewBox="0 0 60 60" xmlSpace="preserve">  <image id="image0" width="60" height="60" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAQAAACQ9RH5AAAABGdBTUEAALGPC/xhBQAAACBjSFJN
            AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZ
            cwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0NDzN/r+StAAACR0lEQVRYw+3Yy2sTURTH8W+bNgVf
            aGhFaxNiAoJou3FVEUQE1yL031BEROjCnf4PLlxILZSGYncuiiC48AEKxghaNGiliAojiBWZNnNd
            xDza3pl77jyCyPzO8ubcT85wmUkG0qT539In+MwgoxQoUqDAKDn2kSNLlp3AGi4uDt9xWOUTK3xg
            hVU2wsIZSkxwnHHGKZOxHKfBe6rUqFGlTkPaVmKGn6iYao1ZyhK2zJfY0FZ9ldBzsbMKxZwZjn/e
            5szGw6UsD5I0W6T+hBhjUjiF7bNInjz37Ruj3igGABjbtpIo3GIh30u4ww5wr3fwfJvNcFeznhBs
            YgXw70TYX2bY/ulkZhWfzfBbTdtrzjPFsvFI+T/L35jhp5q2owDs51VIVvHYDM9sa/LY8XdtKy1l
            FXfM8FVN2/X2ajctZxVXzPA5TZvHpfb6CFXxkerUWTOcY11LX9w0tc20inX2mmF4qG3upnNWrOKB
            hIXLPu3dF1x+kRWq6ysHpkjDl+7eQjatYoOCDIZF3006U0unVSxIWTgTsI3HNP3soSJkFaflMDwL
            3OoHrph9YsPCJJ5466DyOGUHY3Epg2rWloUxnMjsNw7aw3AhMjwVhgW4HYm9FZaFQZ/bp6QeMRQe
            hhHehWKXGY7CAuSpW7MfKUZlAUqWdJ3DcbAAB3guZl9yKC4WYLfmT4muFtgVJwvQx7T2t0mnXK6J
            XlGGyAQvfNkaJ5JBmxnipubJ5HKDbJJsM0eY38QucSx5tJWTVHBwqDDZOzRNmn87fwDoyM4J2hRz
            NgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMi0xM1QxMzoxNTo1MCswMDowMKC8JaoAAAAldEVY
            dGRhdGU6bW9kaWZ5ADIwMjMtMDItMTNUMTM6MTU6NTArMDA6MDDR4Z0WAAAAKHRFWHRkYXRlOnRp
            bWVzdGFtcAAyMDIzLTAyLTEzVDEzOjE1OjUxKzAwOjAwIIO3fQAAAABJRU5ErkJggg=="></image>
            </svg>
              <div className="box">
                {code.map((digit, index) => (
                    <input 
                        key={index}
                        ref={el => inputRefs.current[index] = el}
                        className="input" 
                        type="text" 
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleInputChange(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        style={{textTransform: 'uppercase'}}
                    />
                ))}
              </div>
              {error && <p style={{ color: 'red', textAlign: 'center', position: 'relative', top: '7em' }}>{error}</p>}
              <button type="submit" className="btn1" disabled={isLoading}>
                {isLoading ? '...جاري التحقق' : 'تأكيد'}
              </button>
            </form>

            <style jsx>{`
            .form {
              width: 290px;
              height: 380px;
              display: flex;
              flex-direction: column;
              border-radius: 15px;
              background-color: white;
              box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
              transition: .4s ease-in-out;
            }

            .form:hover {
              box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
              transform: scale(0.99);
            }

            .heading {
              position: relative;
              text-align: center;
              color: black;
              top: 2em;
              font-weight: bold;
              font-size: 1.2rem;
            }

            .check {
              position: relative;
              align-self: center;
              top: 3em;
            }

            .box {
                position: relative;
                top: 5.5em;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .input {
              width: 2.5em;
              height: 2.5em;
              margin: 0.5em;
              border-radius: 5px;
              border: none;
              outline: none;
              background-color: rgb(235, 235, 235);
              box-shadow: inset 3px 3px 6px #d1d1d1,
                        inset -3px -3px 6px #ffffff;
              padding-left: 15px;
              transition: .4s ease-in-out;
              font-size: 1rem;
              text-align: center;
              padding: 0;
            }

            .input:hover {
              box-shadow: inset 0px 0px 0px #d1d1d1,
                        inset 0px 0px 0px #ffffff;
              background-color: lightgrey;
            }

            .input:focus {
              box-shadow: inset 0px 0px 0px #d1d1d1,
                        inset 0px 0px 0px #ffffff;
              background-color: lightgrey;
            }

            .btn1 {
              position: relative;
              top: 8em;
              align-self: center;
              width: 17em;
              height: 3em;
              border-radius: 5px;
              border: none;
              outline: none;
              transition: .4s ease-in-out;
              box-shadow: 1px 1px 3px #b5b5b5,
                         -1px -1px 3px #ffffff;
              background-color: #f0f0f0;
              color: black;
              font-weight: bold;
              cursor: pointer;
            }

            .btn1:active {
              box-shadow: inset 3px 3px 6px #b5b5b5,
                        inset -3px -3px 6px #ffffff;
            }
            .btn1:disabled {
                background-color: #d1d1d1;
                cursor: not-allowed;
            }

            `}</style>
        </div>
    );
}
