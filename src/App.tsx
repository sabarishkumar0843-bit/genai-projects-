import React, { useState, useEffect, useMemo } from 'react';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  onSnapshot, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  format, 
  startOfYear, 
  addWeeks, 
  isSunday, 
  nextSunday, 
  startOfWeek, 
  eachWeekOfInterval, 
  endOfYear,
  getWeek,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Calendar as CalendarIcon, 
  Trophy, 
  Users, 
  Camera, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  TrendingUp,
  LayoutDashboard,
  ChevronRight,
  Upload,
  User as UserIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { OperationType, handleFirestoreError, testFirestoreConnection } from './lib/firestore-utils';
import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- Constants ---
const PASSKEY = "DKDCC2003"; // Updated to DKDCC2003 as per user request

// --- Types ---
type AvailabilityStatus = 'IN' | 'OUT' | 'TENTATIVE';

interface UserProfile {
  uid: string;
  name: string;
  mobile: string;
  jerseyNumber: string;
  photoUrl?: string;
  role: 'player' | 'admin';
  skills?: string[];
  passkey?: string;
}

interface AvailabilityRecord {
  id: string;
  userId: string;
  weekNumber: number;
  date: string;
  status: AvailabilityStatus;
}

interface PerformanceRecord {
  id: string;
  userId: string;
  weekNumber: number;
  imageUrl: string;
  timestamp: any;
}

interface RatingRecord {
  id: string;
  userId: string;
  weekNumber: number;
  rating: number;
  adminId: string;
  timestamp: any;
}

// --- Components ---

const Logo = ({ className, size = "text-2xl" }: { className?: string, size?: string }) => (
  <div className={cn("flex items-center justify-center font-display font-black tracking-normal text-accent select-none", size, className)}>
    <span className="whitespace-nowrap">DKDCC</span>
  </div>
);

const RegisterPage = ({ onBack, onRegistered }: { onBack: () => void, onRegistered: (uid: string) => void }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    if (!mobile || mobile.length < 10) {
      setError('Enter a valid mobile number');
      return;
    }
    setError('');
    const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setSentOtp(mockOtp);
    setSuccess(`Test OTP generated: ${mockOtp}`);
  };

  const handleVerifyOtp = (value: string) => {
    if (value === sentOtp) {
      setIsVerified(true);
      setError('');
      setSuccess('Mobile number verified! You can now create your account.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isVerified) {
      if (otp === sentOtp) {
        setIsVerified(true);
        setSuccess('Mobile number verified!');
      } else {
        setError('Please verify your mobile number first');
        return;
      }
    }
    if (!name || !jerseyNumber) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      // Check if mobile already exists
      const q = query(collection(db, 'users'), where('mobile', '==', mobile));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setError('Mobile number already registered');
        setLoading(false);
        return;
      }

      const uid = `user-${Date.now()}`;
      const profile: UserProfile = {
        uid,
        name,
        mobile,
        jerseyNumber,
        photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        role: 'player',
        passkey: PASSKEY
      };

      await setDoc(doc(db, 'users', uid), profile);
      setSuccess('Account created successfully! Let\'s set your skills...');
      setTimeout(() => onRegistered(uid), 1500);
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-accent shadow-[0_0_30px_rgba(205,255,0,0.3)]">
          <Logo size="text-2xl" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-surface border border-border p-10 shadow-2xl"
      >
        <h2 className="text-3xl font-display uppercase tracking-tighter text-white mb-6 text-center">Register</h2>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim mb-2">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-border text-white focus:border-accent outline-none font-bold"
              placeholder="Enter your name"
              disabled={isVerified}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim mb-2">Mobile Number</label>
            <div className="flex gap-2">
              <input 
                type="tel" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="flex-1 px-4 py-3 bg-black border border-border text-white focus:border-accent outline-none font-bold"
                placeholder="Mobile Number"
                disabled={isVerified}
              />
              {!isVerified && (
                <button 
                  type="button"
                  onClick={handleSendOtp}
                  className="px-4 bg-accent text-black font-bold text-xs uppercase hover:bg-white transition-all"
                >
                  {sentOtp ? 'Resend' : 'Send OTP'}
                </button>
              )}
            </div>
          </div>

          {sentOtp && !isVerified && (
            <div className="space-y-2 p-4 bg-accent/5 border border-accent/20">
              <label className="block text-[10px] font-bold uppercase tracking-[2px] text-accent mb-2 text-center">Enter the 4-digit code sent to you</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setOtp(val);
                    if (val.length === 4) handleVerifyOtp(val);
                  }}
                  className="flex-1 px-4 py-3 bg-black border border-accent text-white focus:border-white outline-none font-bold text-center tracking-[10px] text-2xl"
                  placeholder="0000"
                />
                <button 
                  type="button"
                  onClick={() => handleVerifyOtp(otp)}
                  className="px-6 bg-white text-black font-bold text-xs uppercase hover:bg-accent transition-all animate-pulse"
                >
                  Verify Now
                </button>
              </div>
              <p className="text-[9px] text-accent/60 text-center uppercase font-bold mt-2 italic">Click Verify or enter all 4 digits</p>
            </div>
          )}

          {isVerified && (
            <div className="p-4 bg-accent/10 border border-accent flex items-center gap-3">
              <CheckCircle2 className="text-accent w-5 h-5" />
              <p className="text-accent text-[10px] font-bold uppercase">Mobile Verified Successfully</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim mb-2">Jersey Number</label>
            <input 
              type="text" 
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-border text-white focus:border-accent outline-none font-bold"
              placeholder="e.g. 07"
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}
          {success && <p className="text-accent text-[10px] font-bold uppercase text-center">{success}</p>}

          <button 
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 font-display uppercase text-xl transition-all",
              isVerified 
                ? "bg-accent text-black hover:bg-white shadow-[0_0_20px_rgba(205,255,0,0.3)]" 
                : "bg-border text-text-dim cursor-not-allowed"
            )}
          >
            {loading ? 'Creating Account...' : isVerified ? 'Create Account' : 'Verify Mobile to Continue'}
          </button>

          <button 
            type="button"
            onClick={onBack}
            className="w-full py-2 text-text-dim font-bold uppercase text-[10px] tracking-[2px] hover:text-white transition-all"
          >
            Back to Login
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const SkillSelectionPage = ({ uid, onComplete }: { uid: string, onComplete: () => void }) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const skills = [
    { id: 'Batsman', label: 'Batsman' },
    { id: 'Bowler', label: 'Bowler' },
    { id: 'Wicketkeeper', label: 'Wicketkeeper' }
  ];

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selectedSkills.length === 0) {
      setError('Please select at least one skill');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), { skills: selectedSkills }, { merge: true });
      onComplete();
    } catch (err: any) {
      setError('Failed to save skills');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-accent shadow-[0_0_30px_rgba(205,255,0,0.3)]">
          <Logo size="text-2xl" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-surface border border-border p-10 shadow-2xl"
      >
        <h2 className="text-3xl font-display uppercase tracking-tighter text-white mb-2 text-center">Select Your Cricket Skill</h2>
        <p className="text-text-dim text-[10px] font-bold uppercase tracking-[2px] text-center mb-8">Choose your primary playing skill</p>
        
        <div className="space-y-4 mb-8">
          {skills.map(skill => (
            <button
              key={skill.id}
              onClick={() => toggleSkill(skill.id)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 border transition-all font-bold uppercase tracking-widest text-sm",
                selectedSkills.includes(skill.id)
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-black border-border text-text-dim hover:border-accent/50"
              )}
            >
              {skill.label}
              <div className={cn(
                "w-6 h-6 border flex items-center justify-center transition-all",
                selectedSkills.includes(skill.id) ? "bg-accent border-accent" : "border-border"
              )}>
                {selectedSkills.includes(skill.id) && <Check size={16} className="text-black" />}
              </div>
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center mb-4">{error}</p>}

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-accent text-black font-display uppercase text-xl hover:bg-white transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(205,255,0,0.3)]"
        >
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onLogin, onRegister, onForgotPasskey }: { onLogin: (user: UserProfile) => void, onRegister: () => void, onForgotPasskey: () => void }) => {
  const [loginId, setLoginId] = useState(''); // Name or Mobile
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!loginId || !passkey) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      // Find user by name or mobile
      const usersRef = collection(db, 'users');
      const qMobile = query(usersRef, where('mobile', '==', loginId));
      const qName = query(usersRef, where('name', '==', loginId));
      
      const [snapMobile, snapName] = await Promise.all([getDocs(qMobile), getDocs(qName)]);
      const userDoc = snapMobile.docs[0] || snapName.docs[0];

      if (!userDoc) {
        setError('User not found. Please register first.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data() as UserProfile;
      const correctPasskey = userData.passkey || PASSKEY;

      if (passkey !== correctPasskey) {
        setError('Invalid Passkey');
        setLoading(false);
        return;
      }

      onLogin(userData);
    } catch (err: any) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUid = `demo-${Date.now()}`;
    const profile: UserProfile = {
      uid: demoUid,
      name: 'Demo Player',
      mobile: '0000000000',
      jerseyNumber: '00',
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=demo`,
      role: 'player'
    };
    onLogin(profile);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-8 border-accent shadow-[0_0_30px_rgba(205,255,0,0.4)] relative">
          <Logo size="text-3xl" />
          <div className="absolute inset-0 border-4 border-accent/30 rounded-full pointer-events-none"></div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-surface border border-border p-10 shadow-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display uppercase tracking-tighter leading-none text-white">DKD<br/>TRACKER</h1>
          <p className="text-accent font-bold mt-4 uppercase tracking-widest text-xs">Performance & Availability</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim mb-2">Name or Mobile Number</label>
            <input 
              type="text" 
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full px-4 py-4 bg-black border border-border text-white focus:border-accent transition-all outline-none font-bold"
              placeholder="Enter Name or Mobile"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim">Passkey</label>
              <button 
                type="button"
                onClick={onForgotPasskey}
                className="text-[10px] font-bold uppercase tracking-[1px] text-accent hover:text-white transition-colors"
              >
                Forgot Passkey?
              </button>
            </div>
            <input 
              type="password" 
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              className="w-full px-4 py-4 bg-black border border-border text-white focus:border-accent transition-all outline-none font-bold"
              placeholder="Enter DMCC Passkey"
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-black font-display uppercase text-2xl hover:bg-white transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>

          <div className="pt-4 border-t border-border">
            <button 
              type="button"
              onClick={onRegister}
              className="w-full py-3 bg-white text-black font-display uppercase text-lg hover:bg-accent transition-all"
            >
              Register New Account
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={handleDemoLogin}
            className="text-[10px] text-text-dim uppercase tracking-[2px] hover:text-accent transition-colors font-bold"
          >
            Trouble logging in? Use Demo Mode
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allAvailability, setAllAvailability] = useState<AvailabilityRecord[]>([]);
  const [allPerformance, setAllPerformance] = useState<PerformanceRecord[]>([]);
  const [allRatings, setAllRatings] = useState<RatingRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'upload' | 'analytics' | 'admin'>('calendar');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter states
  const [filterWeek, setFilterWeek] = useState<number | 'all'>('all');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterJersey, setFilterJersey] = useState('');
  const [filterStatus, setFilterStatus] = useState<AvailabilityStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'week' | 'name'>('week');

  useEffect(() => {
    testFirestoreConnection();

    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setAllUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const qAllAvail = query(collection(db, 'availability'));
    const unsubAllAvail = onSnapshot(qAllAvail, (snap) => {
      setAllAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilityRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'availability'));

    const qAllPerf = query(collection(db, 'performance'));
    const unsubAllPerf = onSnapshot(qAllPerf, (snap) => {
      setAllPerformance(snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'performance'));

    const qAllRatings = query(collection(db, 'ratings'));
    const unsubAllRatings = onSnapshot(qAllRatings, (snap) => {
      setAllRatings(snap.docs.map(d => ({ id: d.id, ...d.data() } as RatingRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'ratings'));

    const qMyAvail = query(collection(db, 'availability'), where('userId', '==', user.uid));
    const unsubMyAvail = onSnapshot(qMyAvail, (snap) => {
      setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilityRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'availability'));

    const qMyPerf = query(collection(db, 'performance'), where('userId', '==', user.uid));
    const unsubMyPerf = onSnapshot(qMyPerf, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceRecord));
      // Sort in memory to avoid composite index requirement
      docs.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      setPerformance(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'performance'));

    return () => {
      unsubUsers();
      unsubAllAvail();
      unsubAllPerf();
      unsubMyAvail();
      unsubMyPerf();
    };
  }, [user.uid]);

  const sundays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachWeekOfInterval({ start, end }).map(date => {
      const sunday = isSunday(date) ? date : nextSunday(date);
      return {
        date: sunday,
        formatted: format(sunday, 'MMM dd'),
        week: getWeek(sunday)
      };
    }).filter(s => s.date.getMonth() === currentMonth.getMonth() && s.date.getFullYear() === currentMonth.getFullYear());
  }, [currentMonth]);

  const handleAvailabilityChange = async (week: number, date: Date, status: AvailabilityStatus) => {
    const existing = availability.find(a => a.weekNumber === week);
    const path = 'availability';
    try {
      if (existing) {
        await setDoc(doc(db, path, existing.id), {
          userId: user.uid,
          weekNumber: week,
          date: format(date, 'yyyy-MM-dd'),
          status
        });
      } else {
        await addDoc(collection(db, path), {
          userId: user.uid,
          weekNumber: week,
          date: format(date, 'yyyy-MM-dd'),
          status
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent, week: number) => {
    let file: File | undefined;
    
    if ('target' in e && (e.target as HTMLInputElement).files) {
      file = (e.target as HTMLInputElement).files?.[0];
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      file = e.dataTransfer.files?.[0];
    }

    if (!file) return;

    setUploading(true);
    setUploadProgress(10);
    setIsDragging(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploadProgress(40);
      const path = 'performance';
      try {
        // Simulate progress for better UX
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        await addDoc(collection(db, path), {
          userId: user.uid,
          weekNumber: week,
          imageUrl: reader.result as string,
          timestamp: serverTimestamp()
        });
        
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 1000);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
        setUploading(false);
        setUploadProgress(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGiveRating = async (playerUid: string, week: number, rating: number) => {
    const path = 'ratings';
    try {
      const existing = allRatings.find(r => r.userId === playerUid && r.weekNumber === week);
      if (existing) {
        await setDoc(doc(db, path, existing.id), {
          rating,
          timestamp: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, path), {
          userId: playerUid,
          weekNumber: week,
          rating,
          adminId: user.uid,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const myStats = useMemo(() => {
    const inCount = availability.filter(a => a.status === 'IN').length;
    const outCount = availability.filter(a => a.status === 'OUT').length;
    const tentativeCount = availability.filter(a => a.status === 'TENTATIVE').length;
    const attendance = sundays.length > 0 ? Math.round((inCount / sundays.length) * 100) : 0;
    return { inCount, outCount, tentativeCount, attendance };
  }, [availability, sundays]);

  const teamStats = useMemo(() => {
    return sundays.map(s => {
      const responses = allAvailability.filter(a => a.weekNumber === s.week);
      const available = responses.filter(a => a.status === 'IN').length;
      return {
        name: `W${s.week}`,
        available,
        total: allUsers.length
      };
    }).slice(0, 12);
  }, [allAvailability, allUsers, sundays]);

  const filteredActivity = useMemo(() => {
    const activity = allAvailability.map(a => {
      const u = allUsers.find(user => user.uid === a.userId);
      const perf = allPerformance.find(p => p.userId === a.userId && p.weekNumber === a.weekNumber);
      const rating = allRatings.find(r => r.userId === a.userId && r.weekNumber === a.weekNumber)?.rating;
      return {
        ...a,
        userName: u?.name || 'Unknown',
        userJersey: u?.jerseyNumber || '--',
        scorecard: perf?.imageUrl,
        rating
      };
    });

    return activity
      .filter(a => {
        const searchLower = filterPlayer.toLowerCase();
        const matchesWeek = filterWeek === 'all' || a.weekNumber === filterWeek;
        // Search by name OR jersey in the main search box
        const matchesPlayer = a.userName.toLowerCase().includes(searchLower) || a.userJersey.includes(filterPlayer);
        // Specific jersey filter if used
        const matchesJersey = !filterJersey || a.userJersey.includes(filterJersey);
        const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
        return matchesWeek && matchesPlayer && matchesJersey && matchesStatus;
      })
      .sort((a, b) => {
        if (sortOrder === 'week') return b.weekNumber - a.weekNumber;
        return a.userName.localeCompare(b.userName);
      });
  }, [allAvailability, allUsers, allPerformance, allRatings, filterWeek, filterPlayer, filterJersey, filterStatus, sortOrder]);

  const avgRating = useMemo(() => {
    const userRatings = allRatings.filter(r => r.userId === user.uid);
    if (userRatings.length === 0) return 0;
    const sum = userRatings.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / userRatings.length).toFixed(1);
  }, [allRatings, user.uid]);

  return (
    <div className="min-h-screen bg-bg text-white font-sans flex flex-col md:grid md:grid-cols-[280px_1fr] md:grid-rows-[auto_1fr]">
      {/* Sidebar */}
      <aside className="bg-surface border-r border-border p-8 flex flex-col gap-8 md:row-span-2">
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-2 border-accent shadow-lg">
            <Logo size="text-lg" />
          </div>
          <div className="h-px bg-border w-full" />
        </div>

        <div className="text-center">
          <div className="relative inline-block group">
            <img src={currentUser.photoUrl} alt={currentUser.name} className="w-32 h-32 rounded-full border-4 border-accent object-cover mb-4" referrerPolicy="no-referrer" />
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white w-8 h-8" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    try {
                      await setDoc(doc(db, 'users', currentUser.uid), { ...currentUser, photoUrl: base64 }, { merge: true });
                      setCurrentUser({ ...currentUser, photoUrl: base64 });
                    } catch (err) {
                      console.error("Upload failed:", err);
                    } finally {
                      setUploading(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-accent text-black font-display text-2xl px-2 py-1 leading-none border-2 border-surface">
              #{currentUser.jerseyNumber}
            </div>
          </div>
          <h2 className="font-display text-2xl uppercase tracking-tighter mt-4 leading-none">{currentUser.name}</h2>
          {currentUser.skills && currentUser.skills.length > 0 && (
            <p className="text-[10px] text-accent font-bold uppercase tracking-wider mt-1">
              {currentUser.skills.join(' • ')}
            </p>
          )}
          <p className="text-[10px] text-text-dim uppercase tracking-[2px] mt-2">Authenticated • {PASSKEY}</p>
        </div>

        <nav className="space-y-8">
          <div>
            <p className="nav-title">Availability Overview</p>
            <div className="grid grid-cols-[repeat(13,1fr)] gap-1 mt-3">
              {sundays.map(s => {
                const status = availability.find(a => a.weekNumber === s.week)?.status;
                return (
                  <div 
                    key={s.week} 
                    className={cn(
                      "week-dot",
                      status === 'IN' && "in",
                      status === 'TENTATIVE' && "tentative"
                    )}
                  />
                );
              })}
            </div>
            <p className="text-[12px] mt-3 text-accent font-bold uppercase tracking-wider">
              {availability.length} / 52 Sundays Logged
            </p>
          </div>

          <div className="space-y-4">
            <p className="nav-title">Navigation</p>
            {[
              { id: 'calendar', icon: CalendarIcon, label: 'Availability Poll' },
              { id: 'upload', icon: Camera, label: 'Upload Scorecard' },
              { id: 'analytics', icon: LayoutDashboard, label: 'Performance' },
              ...(currentUser.role === 'admin' ? [{ id: 'admin', icon: Users, label: 'Team Management' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 font-bold uppercase text-xs tracking-widest transition-all border",
                  activeTab === tab.id 
                    ? "bg-accent text-black border-accent" 
                    : "text-white border-border hover:border-accent"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-auto pt-8">
          <button 
            onClick={onLogout}
            className="w-full py-3 border border-accent text-accent font-display text-sm hover:bg-accent hover:text-black transition-all"
          >
            LOG OUT
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="p-8 md:px-12 md:py-10 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-display uppercase tracking-tighter leading-[0.9]">
            WELCOME<br/>BACK, {user.name.split(' ')[0]}
          </h1>
          <p className="text-text-dim text-sm mt-4 font-medium uppercase tracking-widest">Wishing you great performance this week.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-40 bg-surface border border-border p-6 rounded-sm">
            <div className="stat-value">{myStats.inCount.toString().padStart(2, '0')}</div>
            <div className="stat-label">Matches (IN)</div>
          </div>
          <div className="flex-1 md:w-40 bg-surface border border-border p-6 rounded-sm">
            <div className="stat-value">{myStats.attendance}%</div>
            <div className="stat-label">Attendance</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-8"
            >
              <div className="bg-surface border border-border p-8">
                <div className="flex items-center justify-between mb-8">
                  <p className="nav-title m-0">Availability Poll</p>
                  <div className="flex items-center gap-4 bg-black p-2 border border-border">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-accent hover:text-black transition-all text-white"
                    >
                      <ChevronRight className="rotate-180" size={20} />
                    </button>
                    <span className="font-display text-xl uppercase tracking-tighter min-w-[140px] text-center">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-accent hover:text-black transition-all text-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {sundays.map((s) => {
                    const current = availability.find(a => a.weekNumber === s.week);
                    return (
                      <div key={s.week} className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="font-display text-xl uppercase tracking-tighter">{s.formatted}</p>
                          <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1">Week {s.week} • League Match</p>
                        </div>
                        <div className="flex gap-2">
                          {(['IN', 'OUT', 'TENTATIVE'] as AvailabilityStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleAvailabilityChange(s.week, s.date, status)}
                              className={cn(
                                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border",
                                current?.status === status
                                  ? status === 'IN' ? "bg-accent text-black border-accent" :
                                    status === 'OUT' ? "bg-ribbon text-white border-ribbon" :
                                    "bg-yellow-500 text-black border-yellow-500"
                                  : "text-text-dim border-border hover:border-white"
                              )}
                            >
                              {status === 'TENTATIVE' ? 'Tent' : status}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {sundays.length === 0 && (
                    <div className="py-12 text-center text-text-dim uppercase text-xs tracking-widest">
                      No Sundays found for this month
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="bg-surface border border-border p-8">
                <p className="nav-title">Upload Scorecard</p>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => handleFileUpload(e, 1)}
                  className={cn(
                    "border-2 border-dashed p-12 text-center relative group transition-all",
                    isDragging ? "border-accent bg-accent/5" : "border-border bg-white/5 hover:border-accent"
                  )}
                >
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 1)}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={uploading}
                  />
                  <div className={cn(
                    "text-4xl mb-4 transition-all",
                    isDragging ? "scale-125 opacity-100" : "opacity-50 group-hover:scale-110"
                  )}>
                    {uploading ? '⏳' : '📁'}
                  </div>
                  <p className="font-display text-2xl uppercase tracking-tighter">
                    {uploading ? 'Uploading...' : isDragging ? 'Drop it here' : 'Drop Scorecard'}
                  </p>
                  <p className="text-[10px] text-text-dim uppercase tracking-widest mt-2">PNG or JPG up to 5MB</p>
                  
                  {!uploading && (
                    <button className="mt-8 px-8 py-3 bg-white text-black font-display uppercase text-sm rounded-full">
                      Select File
                    </button>
                  )}

                  {uploading && (
                    <div className="mt-8 w-full max-w-xs mx-auto">
                      <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-accent"
                        />
                      </div>
                      <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-2">
                        {uploadProgress}% Complete
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-border p-8">
                <p className="nav-title">Recent History</p>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {performance.map(p => (
                    <div key={p.id} className="flex gap-4 p-4 bg-black border border-border">
                      <div className="w-20 h-20 bg-border flex-shrink-0 overflow-hidden">
                        <img src={p.imageUrl} alt="Proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-display text-lg uppercase tracking-tighter">Week {p.weekNumber}</p>
                        <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1">
                          {p.timestamp?.toDate ? format(p.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-surface border border-border p-8">
                  <p className="nav-title">Participation Analytics</p>
                  <div className="h-[200px] w-full mt-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamStats}>
                        <Bar dataKey="available" fill="#CDFF00" radius={[2, 2, 0, 0]} />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#fff', fontFamily: 'Arial Black' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] text-text-dim uppercase tracking-widest font-bold">
                    <span>Week 1</span>
                    <span>Week 12</span>
                  </div>
                </div>

                <div className="bg-surface border border-border p-8 flex flex-col items-center justify-center text-center">
                  <div className="stat-value text-accent text-6xl">{avgRating}</div>
                  <div className="stat-label">Avg Rating</div>
                  <div className="w-full h-px bg-border my-8" />
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    {Number(avgRating) >= 8 ? 'Top 5% of Team DKD' : 'Keep performing!'}
                  </p>
                </div>
              </div>

              <div className="bg-surface border border-border p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <p className="nav-title mb-0">Team Activity Log</p>
                  <div className="flex flex-wrap gap-2">
                    <select 
                      value={filterWeek} 
                      onChange={(e) => setFilterWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="bg-black border border-border text-white text-[10px] font-bold uppercase px-3 py-2 outline-none focus:border-accent"
                    >
                      <option value="all">All Weeks</option>
                      {sundays.map(s => <option key={s.week} value={s.week}>Week {s.week}</option>)}
                    </select>
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="bg-black border border-border text-white text-[10px] font-bold uppercase px-3 py-2 outline-none focus:border-accent"
                    >
                      <option value="all">All Status</option>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                      <option value="TENTATIVE">TENTATIVE</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Search Name or #..."
                      value={filterPlayer}
                      onChange={(e) => setFilterPlayer(e.target.value)}
                      className="bg-black border border-border text-white text-[10px] font-bold uppercase px-3 py-2 outline-none focus:border-accent w-40"
                    />
                    <input 
                      type="text" 
                      placeholder="Jersey #..."
                      value={filterJersey}
                      onChange={(e) => setFilterJersey(e.target.value)}
                      className="bg-black border border-border text-white text-[10px] font-bold uppercase px-3 py-2 outline-none focus:border-accent w-24"
                    />
                    <button 
                      onClick={() => {
                        setFilterWeek('all');
                        setFilterStatus('all');
                        setFilterPlayer('');
                        setFilterJersey('');
                        setSortOrder('week');
                      }}
                      className="bg-ribbon text-white text-[10px] font-bold uppercase px-4 py-2 hover:bg-white hover:text-black transition-all shadow-lg"
                    >
                      Reset All Filters
                    </button>
                    <button 
                      onClick={() => setSortOrder(sortOrder === 'week' ? 'name' : 'week')}
                      className="bg-border text-white text-[10px] font-bold uppercase px-3 py-2 hover:bg-accent hover:text-black transition-all"
                    >
                      Sort: {sortOrder}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Player</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Week</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Status</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Rating</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Scorecard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredActivity.map((a, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-accent text-black font-display text-xs flex items-center justify-center rounded-full">
                                #{a.userJersey}
                              </div>
                              <span className="font-display text-sm uppercase tracking-tighter">{a.userName}</span>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-xs text-text-dim">
                            <div className="flex flex-col">
                              <span>WEEK {a.weekNumber}</span>
                              <span className="text-[10px] opacity-50">{format(parseISO(a.date), 'MMM dd')}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "px-2 py-1 text-[9px] font-bold uppercase tracking-widest",
                              a.status === 'IN' ? "bg-accent text-black" : 
                              a.status === 'TENTATIVE' ? "bg-yellow-500 text-black" : "bg-ribbon text-white"
                            )}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-4">
                            {a.rating ? (
                              <div className="flex items-center gap-1">
                                <span className="text-accent text-sm">★</span>
                                <span className="font-display text-lg text-white">{a.rating}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-text-dim uppercase font-bold">--</span>
                            )}
                          </td>
                          <td className="py-4">
                            {a.scorecard ? (
                              <div className="w-10 h-10 bg-border overflow-hidden border border-border hover:border-accent transition-all cursor-pointer">
                                <img src={a.scorecard} alt="Scorecard" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <span className="text-[9px] text-text-dim uppercase font-bold">No Upload</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredActivity.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-text-dim uppercase text-[10px] font-bold tracking-[2px]">
                            No activity found matching filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-surface border border-border p-8">
                <p className="nav-title">Team Roster</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsers.map(u => (
                    <div key={u.uid} className="flex items-center gap-4 p-4 bg-black border border-border">
                      <img src={u.photoUrl} alt={u.name} className="w-12 h-12 rounded-full border border-border" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-display text-sm uppercase tracking-tighter leading-none">{u.name}</p>
                        <p className="text-[10px] text-accent font-bold mt-1">#{u.jerseyNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && currentUser.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-surface border border-border p-8">
                <p className="nav-title">Player Ratings (Week {getWeek(new Date())})</p>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Player</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Skill</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Rating (1-10)</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allUsers.filter(u => u.role !== 'admin').map(player => {
                        const currentRating = allRatings.find(r => r.userId === player.uid && r.weekNumber === getWeek(new Date()))?.rating || 0;
                        return (
                          <tr key={player.uid} className="hover:bg-white/5 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <img src={player.photoUrl} className="w-8 h-8 rounded-full border border-accent" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="font-bold uppercase text-xs">{player.name}</p>
                                  <p className="text-[10px] text-text-dim">#{player.jerseyNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-[10px] font-bold uppercase text-accent">
                              {player.skills?.join(', ') || '--'}
                            </td>
                            <td className="py-4">
                              <input 
                                type="number" 
                                min="1" 
                                max="10"
                                defaultValue={currentRating || ''}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (val >= 1 && val <= 10) {
                                    handleGiveRating(player.uid, getWeek(new Date()), val);
                                  }
                                }}
                                className="w-16 bg-black border border-border text-white px-2 py-1 outline-none focus:border-accent font-bold"
                              />
                            </td>
                            <td className="py-4">
                              <span className="text-[10px] font-bold uppercase text-text-dim">
                                {currentRating > 0 ? 'Rated' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const ForgotPasskeyPage = ({ onBack }: { onBack: () => void }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [newPasskey, setNewPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userUid, setUserUid] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!mobile || mobile.length < 10) {
      setError('Enter a valid mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('mobile', '==', mobile));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error('Mobile number not found');
      }
      setUserUid(snap.docs[0].id);
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setSentOtp(mockOtp);
      setSuccess(`Test OTP generated: ${mockOtp}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (value: string) => {
    if (value === sentOtp) {
      setIsVerified(true);
      setError('');
      setSuccess('Mobile number verified! Enter your new passkey.');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasskey) {
      setError('Enter a new passkey');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', userUid!), { passkey: newPasskey }, { merge: true });
      setSuccess('Passkey reset successfully! Redirecting to login...');
      setTimeout(() => onBack(), 2000);
    } catch (err: any) {
      setError('Failed to reset passkey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-accent shadow-[0_0_30px_rgba(205,255,0,0.3)]">
          <Logo size="text-2xl" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-surface border border-border p-10 shadow-2xl"
      >
        <h2 className="text-3xl font-display uppercase tracking-tighter text-white mb-6 text-center">Reset Passkey</h2>
        
        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim mb-2">Mobile Number</label>
            <div className="flex gap-2">
              <input 
                type="tel" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                disabled={!!sentOtp || loading}
                className="flex-1 px-4 py-3 bg-black border border-border text-white focus:border-accent outline-none font-bold disabled:opacity-50"
                placeholder="9087534132"
              />
              {!sentOtp && (
                <button 
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="px-4 bg-white text-black font-bold text-xs uppercase hover:bg-accent transition-all disabled:opacity-50"
                >
                  {loading ? '...' : 'Send'}
                </button>
              )}
            </div>
          </div>

          {sentOtp && !isVerified && (
            <div className="space-y-2 p-4 bg-accent/5 border border-accent/20">
              <label className="block text-[10px] font-bold uppercase tracking-[2px] text-accent mb-2 text-center">Enter OTP</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setOtp(val);
                    if (val.length === 4) handleVerifyOtp(val);
                  }}
                  className="flex-1 px-4 py-3 bg-black border border-accent text-white focus:border-white outline-none font-bold text-center tracking-[10px] text-2xl"
                  placeholder="0000"
                />
              </div>
              <p className="text-[9px] text-accent/60 text-center uppercase font-bold mt-2 italic">Test OTP: {sentOtp}</p>
            </div>
          )}

          {isVerified && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[2px] text-text-dim mb-2">New Passkey</label>
              <input 
                type="password" 
                value={newPasskey}
                onChange={(e) => setNewPasskey(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-border text-white focus:border-accent outline-none font-mono"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}
          {success && <p className="text-accent text-[10px] font-bold uppercase text-center">{success}</p>}

          {isVerified && (
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-black font-display uppercase text-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(205,255,0,0.3)]"
            >
              {loading ? 'Resetting...' : 'Reset Passkey'}
            </button>
          )}

          <button 
            type="button"
            onClick={onBack}
            className="w-full text-[10px] font-bold uppercase tracking-[2px] text-text-dim hover:text-white transition-colors"
          >
            Back to Login
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'skills' | 'forgot-passkey'>('login');
  const [tempUid, setTempUid] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Check local storage for session
    const savedUser = localStorage.getItem('dkd_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setAuthReady(true);
  }, []);

  const handleLogin = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem('dkd_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dkd_user');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg">
        {!user ? (
          view === 'login' ? (
            <LoginPage onLogin={handleLogin} onRegister={() => setView('register')} onForgotPasskey={() => setView('forgot-passkey')} />
          ) : view === 'register' ? (
            <RegisterPage onRegistered={(uid) => { setTempUid(uid); setView('skills'); }} onBack={() => setView('login')} />
          ) : view === 'skills' ? (
            <SkillSelectionPage uid={tempUid} onComplete={() => setView('login')} />
          ) : (
            <ForgotPasskeyPage onBack={() => setView('login')} />
          )
        ) : (
          <Dashboard user={user} onLogout={handleLogout} />
        )}
      </div>
    </ErrorBoundary>
  );
}
