import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Plus, 
  Home, 
  PieChart as AnalyticsIcon, 
  Settings, 
  History, 
  X, 
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Coffee,
  Car,
  Utensils,
  CreditCard,
  Wifi,
  Home as HomeIcon,
  Package,
  Heart,
  Book,
  MoreHorizontal,
  Users,
  Stethoscope,
  Shirt,
  Pizza,
  Baby,
  User as UserIcon,
  Zap,
  Wallet,
  Sparkles,
  Briefcase,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Cloud,
  CloudOff,
  Coins as BudgetIcon,
  TrendingUp,
  AlertCircle,
  Flag,
  Mountain,
  Trophy,
  Shield,
  Info,
  Sun,
  Wind,
  CloudRain,
  CloudLightning,
  Cloudy as CloudyIcon,
  MapPin,
  Trash2,
  AlertTriangle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  addMonths, 
  subMonths, 
  eachDayOfInterval, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  differenceInDays
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip
} from 'recharts';
import { supabase } from './lib/supabase';

// --- Constants ---
// --- Audio Utilities (Using Web Audio API) ---
const playCoinSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) { console.error("Audio error", e); }
};

const playTriumphSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, delay, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    };
    playNote(523.25, 0, 0.3); // C5
    playNote(659.25, 0.1, 0.3); // E5
    playNote(783.99, 0.2, 0.3); // G5
    playNote(1046.5, 0.3, 0.5); // C6
  } catch (e) { console.error("Audio error", e); }
};

const CATEGORIES = [
  { id: 'food', name: '食費', icon: Utensils, color: '#ff2d55' },
  { id: 'minato_ui', name: '湊唯', icon: Baby, color: '#ffcc00' },
  { id: 'haru_san', name: 'はるさん', icon: UserIcon, color: '#af52de' },
  { id: 'yuu_san', name: 'ゆうさん', icon: UserIcon, color: '#007aff' },
  { id: 'dining', name: '外食', icon: Pizza, color: '#ff9500' },
  { id: 'necessities', name: '日用品', icon: Package, color: '#34c759' },
  { id: 'housing', name: '住居', icon: HomeIcon, color: '#5856d6' },
  { id: 'utilities', name: '光熱費', icon: Zap, color: '#00c7be' },
  { id: 'shopping', name: '買い物', icon: ShoppingBag, color: '#5ac8fa' },
  { id: 'transport', name: '交通費', icon: Car, color: '#a2845e' },
  { id: 'medical', icon: Heart, name: '医療・健康', color: '#ff3b30' },
  { id: 'entertainment', name: '趣味・娯楽', icon: Sparkles, color: '#00f2ff' },
  { id: 'cafe', name: 'カフェ', icon: Coffee, color: '#ff6b6b' },
  { id: 'other', name: 'その他', icon: MoreHorizontal, color: '#8e8e93' },
];

const INCOME_CATEGORIES = [
  { id: 'salary', name: '給与', icon: Wallet, color: '#34c759' },
  { id: 'extra', name: '臨時収入', icon: Sparkles, color: '#ffcc00' },
  { id: 'child_allowance', name: '児童手当他', icon: Briefcase, color: '#007aff' },
  { id: 'other_income', name: 'その他', icon: MoreHorizontal, color: '#8e8e93' },
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [yearlyGoal, setYearlyGoal] = useState(() => {
    const saved = localStorage.getItem('kakeibo-yearly-goal');
    return saved ? Number(saved) : 1200000;
  });

  const handleGoalChange = (val) => {
    setYearlyGoal(val);
    localStorage.setItem('kakeibo-yearly-goal', val);
    // Reset summit milestone so it can be reached again for the new goal!
    localStorage.removeItem('milestone-seen-summit');
  };
  
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem('kakeibo-budget');
    return saved ? Number(saved) : 150000;
  });

  const [baseIncome, setBaseIncome] = useState(() => {
    const saved = localStorage.getItem('kakeibo-base-income');
    return saved ? Number(saved) : 350000;
  });

  const handleBaseIncomeChange = (val) => {
    setBaseIncome(val);
    localStorage.setItem('kakeibo-base-income', val);
  };

  const calculatePotentialBudget = useCallback((income, txs, targetGoal) => {
    const monthlySavings = targetGoal / 12;
    const fixedCats = ['housing', 'utilities'];
    const fixedTxs = txs.filter(t => fixedCats.includes(t.category));
    
    // Group by month
    const monthlyFixed = fixedTxs.reduce((acc, t) => {
      const m = format(new Date(t.date), 'yyyy-MM');
      acc[m] = (acc[m] || 0) + Number(t.amount);
      return acc;
    }, {});
    
    const fixedValues = Object.values(monthlyFixed);
    const avgFixed = fixedValues.length > 0 ? (fixedValues.reduce((s,v)=>s+v, 0) / fixedValues.length) : 0;
    
    return Math.max(0, Math.round(income - monthlySavings - avgFixed));
  }, []);

  const [activeMilestone, setActiveMilestone] = useState(null);
  const [activeMission, setActiveMission] = useState(() => {
    const saved = localStorage.getItem('kakeibo-mission');
    return saved ? JSON.parse(saved) : null;
  });
  const [isMissionOpen, setIsMissionOpen] = useState(false);

  const MISSIONS = [
    { id: 1, title: "外食守備任務", desc: "今週の外食をあと1回以内に抑えよう！自炊で冒険の体力を温存だ。", icon: Utensils },
    { id: 2, title: "ドラッグストア騎士", desc: "ドラッグストアでの「ついで買い」を合計2,000円以内に抑えよう！", icon: ShoppingBag },
    { id: 3, title: "継続の冒険者", desc: "今日から3日間、欠かさず家計簿に記録しよう。継続は力なり！", icon: Zap },
    { id: 4, title: "ゼロの境地", desc: "今週、支出が全くない「ノーマネーデー」を1日達成せよ！", icon: Shield },
    { id: 5, title: "未来への布石", desc: "今週、さらに5,000円追加で貯金に回すチャレンジ！", icon: Wallet },
    { id: 6, title: "週末の守護者", desc: "土日の支出を合計5,000円以内に抑えて、来週へ備えよう！", icon: Heart },
    { id: 7, title: "ショッピング断捨離", desc: "今週は「衣服・美容」などの贅沢品購入を一度お休みしてみよう！", icon: Coffee },
    { id: 8, title: "カフェ自粛任務", desc: "今週のカフェ代を1,000円以内に！マイボトルで攻略だ。", icon: Coffee }
  ];

  // Mission Logic
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekStr = format(new Date(), 'yyyy-ww');
    
    // Logic: If no mission this week, or 1 mission completed and wait 3 days
    if (!activeMission || (activeMission.week !== weekStr && activeMission.date !== todayStr)) {
      // Chance to trigger: 30% per day, max 2 per week
      const lastTriggered = localStorage.getItem('kakeibo-mission-last-date');
      const missionCountThisWeek = Number(localStorage.getItem(`kakeibo-mission-count-${weekStr}`) || 0);

      if (missionCountThisWeek < 2 && lastTriggered !== todayStr && Math.random() < 0.3) {
        const randomMission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
        const newMission = { ...randomMission, date: todayStr, week: weekStr, seen: false };
        setActiveMission(newMission);
        localStorage.setItem('kakeibo-mission', JSON.stringify(newMission));
        localStorage.setItem('kakeibo-mission-last-date', todayStr);
        localStorage.setItem(`kakeibo-mission-count-${weekStr}`, (missionCountThisWeek + 1).toString());
      }
    }
  }, [transactions]);

  useEffect(() => {
    const saved = localStorage.getItem('kakeibo-txs');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // Real-time Milestone & Summit Detection
  useEffect(() => {
    if (transactions.length > 0) {
      const firstDate = new Date(Math.min(...transactions.map(t => new Date(t.date))));
      const days = differenceInDays(new Date(), firstDate);
      
      const fixedTargets = [7, 30, 90, 180, 365];
      let recurringTarget = 365 + 180;
      while (days >= recurringTarget) {
        fixedTargets.push(recurringTarget);
        recurringTarget += 180;
      }
      
      const milestoneToRecord = fixedTargets.find(t => days >= t && !localStorage.getItem(`milestone-seen-${t}`));
      if (milestoneToRecord !== undefined) {
        setActiveMilestone(milestoneToRecord);
      }

      // Reset 'seen' flags for any milestones we are CURRENTLY below
      // This allows them to trigger again if we reach them again
      fixedTargets.forEach(t => {
        if (days < t) {
          localStorage.removeItem(`milestone-seen-${t}`);
        }
      });

      // Summit Check
      const currentSavings = transactions.filter(t => t.type === 'income').reduce((s,t)=>s+Number(t.amount) ,0) - 
                             transactions.filter(t => t.type !== 'income').reduce((s,t)=>s+Number(t.amount) ,0);
      
      if (currentSavings >= yearlyGoal && !localStorage.getItem('milestone-seen-summit')) {
        setActiveMilestone('summit');
      } else if (currentSavings < yearlyGoal) {
        localStorage.removeItem('milestone-seen-summit');
      }

      // Hidden Gimmick: Dec 31st Yearly Report
      const today = new Date();
      const currentYear = today.getFullYear();
      if (today.getMonth() === 11 && today.getDate() === 31 && !localStorage.getItem(`report-seen-${currentYear}`)) {
        setActiveMilestone('yearly-report');
      }
    }
  }, [transactions, yearlyGoal]);

  const fetchCloudData = useCallback(async () => {
    if (!supabase || !user) return;
    setIsSyncing(true);
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (!error && data) {
      setTransactions(data);
      localStorage.setItem('kakeibo-txs', JSON.stringify(data));
    }
    setIsSyncing(false);
  }, [user]);

  const saveTransaction = async (tx) => {
    const newTransactions = [tx, ...transactions];
    setTransactions(newTransactions);
    localStorage.setItem('kakeibo-txs', JSON.stringify(newTransactions));

    // Auto-Budget Logic: If salary is entered, update budget!
    if (tx.type === 'income' && tx.category === 'salary') {
      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const monthlySalaryTotal = newTransactions
        .filter(t => t.type === 'income' && t.category === 'salary' && format(new Date(t.date), 'yyyy-MM') === currentMonthStr)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const newB = calculatePotentialBudget(monthlySalaryTotal, newTransactions, yearlyGoal);
      setMonthlyBudget(newB);
      localStorage.setItem('kakeibo-budget', newB);
      setBaseIncome(monthlySalaryTotal);
      localStorage.setItem('kakeibo-base-income', monthlySalaryTotal);
    }

    if (supabase && user) {
      setIsSyncing(true);
      await supabase.from('transactions').insert([{ ...tx, user_id: user.id }]);
      setIsSyncing(false);
    }
    playCoinSound();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setIsAddOpen(false);
  };

  const removeTransaction = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const newTransactions = transactions.filter(t => t.id !== id);
    setTransactions(newTransactions);
    localStorage.setItem('kakeibo-txs', JSON.stringify(newTransactions));
    if (supabase && user) {
      setIsSyncing(true);
      await supabase.from('transactions').delete().eq('id', id);
      setIsSyncing(false);
    }
    setDeleteId(null);
  };

  const { filteredTransactions, totalIncome, totalExpense, balance, progress, categorySegments, cumulativeSavings } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const filtered = transactions.filter(t => isWithinInterval(new Date(t.date), { start, end }));
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalInc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
    const safeBudget = monthlyBudget || 1;
    const segments = CATEGORIES.map(cat => {
      const amount = filtered.filter(t => t.type !== 'income' && t.category === cat.id).reduce((s, t) => s + Number(t.amount), 0);
      return { ...cat, amount, percent: (amount / safeBudget) * 100 };
    }).filter(s => s.amount > 0);
    return {
      filteredTransactions: filtered,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      progress: (expense / safeBudget) * 100,
      categorySegments: segments,
      cumulativeSavings: totalInc - totalExp
    };
  }, [transactions, currentDate, monthlyBudget]);

  const isFirstMonth = useMemo(() => format(currentDate, 'yyyy-MM') === '2026-04', [currentDate]);

  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: '24px' }}>
        <div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>おかえりなさい 👋</p>
          <h1 className="text-gradient">Lumina Kakeibo</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {activeMission && (
            <button 
              onClick={() => {
                const updated = { ...activeMission, seen: true };
                setActiveMission(updated);
                localStorage.setItem('kakeibo-mission', JSON.stringify(updated));
                setIsMissionOpen(true);
              }}
              className="btn-icon" 
              style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Shield size={20} color={activeMission.seen ? "var(--text-dim)" : "#ff9500"} />
              {!activeMission.seen && (
                 <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: '#ff2d55', borderRadius: '50%', border: '1.5px solid white' }} />
              )}
            </button>
          )}
          <div style={{ alignSelf: 'center', opacity: 0.6 }}>
            {user ? <Cloud size={20} color={isSyncing ? 'var(--secondary)' : '#34c759'} /> : <CloudOff size={20} color="var(--text-dim)" />}
          </div>
          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={20} /></button>
        </div>
      </header>

      <main className="container space-y-8 no-scrollbar">
        {activeTab === 'home' && (
          <>
            <div className="flex-between glass" style={{ padding: '8px 16px', borderRadius: '30px' }}>
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-icon" style={{ width: 32, height: 32, border: 'none', opacity: isFirstMonth ? 0 : 1, pointerEvents: isFirstMonth ? 'none' : 'auto' }}><ChevronLeft size={20} /></button>
              <h2 style={{ fontSize: '1.2rem' }}>{format(currentDate, 'yyyy年 M月')}</h2>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-icon" style={{ width: 32, height: 32, border: 'none' }}><ChevronRight size={20} /></button>
            </div>

            <GoalMountainCard goal={yearlyGoal} current={cumulativeSavings} monthlyBudget={monthlyBudget} totalExpense={totalExpense} transactions={filteredTransactions} />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass summary-card">
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>現在の残高（月）</p>
                  <h2 className="amount-large" style={{ margin: 0 }}>¥{balance.toLocaleString()}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>予算進捗</p>
                  <p style={{ fontWeight: 700, color: progress > 100 ? 'var(--primary)' : 'var(--text-main)' }}>{progress.toFixed(0)}%</p>
                </div>
              </div>
              <div className="progress-container" style={{ display: 'flex' }}>
                {categorySegments.map((seg, idx) => (
                  <motion.div key={seg.id} initial={{ width: 0 }} animate={{ width: `${Math.min(seg.percent, 100)}%` }} style={{ height: '100%', background: seg.color, borderRight: idx < categorySegments.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none' }} />
                ))}
                {progress === 0 && <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.05)' }} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
                <div className="glass" style={{ padding: '12px', background: 'rgba(52, 199, 89, 0.05)', borderColor: 'rgba(52, 199, 89, 0.1)' }}>
                  <div className="flex-between"><span style={{ fontSize: '0.7rem', color: '#34c759', fontWeight: 700 }}>収入</span><ArrowUpRight size={14} color="#34c759" /></div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>¥{totalIncome.toLocaleString()}</p>
                </div>
                <div className="glass" style={{ padding: '12px', background: 'rgba(255, 45, 85, 0.05)', borderColor: 'rgba(255, 45, 85, 0.1)' }}>
                  <div className="flex-between"><span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>支出</span><ArrowDownRight size={14} color="var(--primary)" /></div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>¥{totalExpense.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <section className="space-y-4">
              <div className="flex-between">
                <h2 style={{ fontSize: '1.2rem' }}>履歴</h2>
                <button onClick={fetchCloudData} style={{ color: 'var(--secondary)', border: 'none', background: 'none', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>同期 <History size={14} /></button>
              </div>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.slice(0, 15).map((tx) => <TransactionItem key={tx.id} tx={tx} onDelete={setDeleteId} />)}
                  {filteredTransactions.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}><History size={48} style={{ opacity: 0.2, marginBottom: '16px' }} /><p>この月の履歴はありません</p></div>}
                </AnimatePresence>
              </div>
            </section>
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsPage transactions={filteredTransactions} categories={CATEGORIES} currentDate={currentDate} onMonthChange={setCurrentDate} onDeleteTransaction={setDeleteId} />}
      </main>

      <div className="bottom-nav-container">
        <div className="glass-dark bottom-nav">
          <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} />
          <button onClick={() => setIsAddOpen(true)} className="btn-add"><Plus size={32} strokeWidth={3} /></button>
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={AnalyticsIcon} />
        </div>
      </div>

      <AnimatePresence>
        {isAddOpen && <AddTransactionModal onClose={() => setIsAddOpen(false)} onAdd={saveTransaction} />}
        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)} 
            user={user} 
            budget={monthlyBudget} 
            goal={yearlyGoal} 
            baseIncome={baseIncome}
            transactions={transactions}
            onSave={(b, g, inc) => { 
              setMonthlyBudget(b); 
              handleGoalChange(g); 
              handleBaseIncomeChange(inc);
              setIsSettingsOpen(false); 
            }} 
          />
        )}
        {deleteId && <ConfirmDeleteModal tx={transactions.find(t => t.id === deleteId)} onCancel={() => setDeleteId(null)} onConfirm={removeTransaction} />}
        <AnimatePresence>
          {isMissionOpen && activeMission && (
            <MissionModal mission={activeMission} onClose={() => setIsMissionOpen(false)} />
          )}
          {activeMilestone === 'summit' ? (
            <SummitModal 
              transactions={transactions} 
              onClose={() => {
                localStorage.setItem('milestone-seen-summit', 'true');
                setActiveMilestone(null);
                setIsSettingsOpen(true); 
              }} 
            />
          ) : activeMilestone === 'yearly-report' ? (
            <YearlyReportModal 
              transactions={transactions} 
              onClose={() => {
                localStorage.setItem(`report-seen-${new Date().getFullYear()}`, 'true');
                setActiveMilestone(null);
              }} 
            />
          ) : activeMilestone !== null && (
            <MilestoneModal 
              days={activeMilestone} 
              transactions={transactions} 
              onClose={() => {
                localStorage.setItem(`milestone-seen-${activeMilestone}`, 'true');
                setActiveMilestone(null);
              }} 
            />
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

// --- Milestone Modal ---
function MilestoneModal({ days, transactions, onClose }) {
  useEffect(() => {
    playTriumphSound();
    // Blast confetti! (Upgraded to 5 seconds!)
    const end = Date.now() + 5 * 1000;
    const colors = ['#ff9500', '#ff2d55', '#34c759', '#af52de'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.65 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.65 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }, []);

  const totalSaved = transactions.filter(t => t.type === 'income').reduce((s,t)=>s+Number(t.amount), 0) - 
                     transactions.filter(t => t.type !== 'income').reduce((s,t)=>s+Number(t.amount), 0);
  
  const getMilestoneLabel = (d) => {
    if (d === 7) return "冒険者への第一歩！";
    if (d === 30) return "祝・1ヶ月継続！";
    if (d === 90) return "祝・3ヶ月継続！";
    if (d === 180) return "祝・半年記念！";
    if (d === 365) return "祝・1周年奪還！！";
    if (d > 365) {
      return `祝・${(d/365).toFixed(1)}周年アワード！`;
    }
    return "マイルストーン達成！";
  };

  const label = getMilestoneLabel(days);

  return (
    <div className="modal-overlay centered" style={{ zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)' }}>
      {/* Animated Background Elements */}
      {[...Array(10)].map((_, i) => (
        <motion.div 
          key={i}
          animate={{ 
            y: [-20, 20, -20], 
            rotate: [0, 360], 
            opacity: [0.1, 0.4, 0.1] 
          }}
          transition={{ duration: 10 + i, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            color: 'white',
            pointerEvents: 'none'
          }}
        >
          <Sparkles size={20 + Math.random() * 30} />
        </motion.div>
      ))}

      <motion.div 
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }} 
        animate={{ opacity: 1, scale: 1, rotate: 0 }} 
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
        className="glass" 
        style={{ 
          width: '90%', 
          maxWidth: '380px', 
          padding: '48px 24px', 
          textAlign: 'center', 
          background: 'linear-gradient(135deg, #1a1a1e 0%, #2c2c2e 100%)',
          color: 'white',
          border: '2px solid rgba(255,149,0,0.3)',
          boxShadow: '0 0 50px rgba(255,149,0,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: -100, left: -100, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,149,0,0.3) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        
        <motion.div 
          animate={{ y: [0, -15, 0], scale: [1, 1.1, 1], filter: ['drop-shadow(0 0 10px rgba(255,149,0,0))', 'drop-shadow(0 0 30px rgba(255,149,0,0.8))', 'drop-shadow(0 0 10px rgba(255,149,0,0))'] }} 
          transition={{ repeat: Infinity, duration: 4 }}
          style={{ marginBottom: '32px', display: 'inline-block' }}
        >
          <Trophy size={100} color="#ff9500" />
        </motion.div>
        
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ff9500', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Milestone Unlocked</h3>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>{label}</h2>
        
        <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '40px' }}>
          あなたの「家計の冒険」は、開始から{days}日が経過しました。<br/>
          この素晴らしい一歩は、理想の未来（山頂）への着実な軌跡です。
        </p>

        <div className="space-y-4" style={{ marginBottom: '48px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '4px', textAlign: 'center' }}>現在の貯金額</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34c759' }}>¥{totalSaved.toLocaleString()}</p>
            </div>
            <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '4px', textAlign: 'center' }}>記録回数</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{transactions.length}回</p>
            </div>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose} 
          className="btn-primary" 
          style={{ background: 'linear-gradient(135deg, #ff9500, #ffcc00)', color: 'black', fontWeight: 900, fontSize: '1.1rem', padding: '16px 32px' }}
        >
          冒険の続きをはじめる
        </motion.button>
      </motion.div>
    </div>
  );
}

// --- Custom Confirmation Modal ---

function ConfirmDeleteModal({ tx, onCancel, onConfirm }) {
  if (!tx) return null;
  const isIncome = tx.type === 'income';
  const category = (isIncome ? INCOME_CATEGORIES : CATEGORIES).find(c => c.id === tx.category) || { name: 'その他', icon: Info, color: '#8e8e93' };

  return (
    <div className="modal-overlay centered">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-dark modal-content centered"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'rgba(255, 45, 85, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Trash2 size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>履歴を完全に消去しますか？</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '32px' }}>「{tx.memo || category.name}」の記録を削除します。<br/>この操作は取り消せません。</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={onCancel} className="btn-secondary" style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 700 }}>キャンセル</button>
            <button onClick={() => onConfirm(tx.id)} className="btn-primary" style={{ fontWeight: 800 }}>削除する</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Goal Mountain Card ---

function GoalMountainCard({ goal, current, monthlyBudget, totalExpense, transactions }) {
  const percent = Math.min(Math.max((current / (goal || 1)) * 100, 0), 100);
  const remaining = monthlyBudget - totalExpense;
  
  // Variable Analysis (Excluding Fixed Costs)
  const FIXED_CATEGORIES = ['housing', 'utilities'];
  const variableTxs = transactions.filter(t => t.type !== 'income' && !FIXED_CATEGORIES.includes(t.category));
  const categoryTotals = variableTxs.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});
  
  const topCategoryId = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, null);
  const topCategory = CATEGORIES.find(c => c.id === topCategoryId);

  const weather = remaining >= 50000 ? { type: 'sunny', color: '#007aff', icon: Sun, label: '晴天！', bgColor: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)' } :
                  remaining >= 20000 ? { type: 'cloudy', color: '#6e6e73', icon: CloudyIcon, label: '曇り', bgColor: 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%)' } :
                  remaining >= 0 ? { type: 'rainy', color: '#5e5ce6', icon: CloudRain, label: '雨模様', bgColor: 'linear-gradient(135deg, #edeff5 0%, #ffffff 100%)' } :
                  { type: 'stormy', color: '#2c2c2e', icon: CloudLightning, label: '嵐！', bgColor: 'linear-gradient(135deg, #e5e5ea 0%, #ffffff 100%)' };
  
  const getAdvice = () => {
    if (percent >= 100) return "登頂おめでとう！🎉 最高の景色ですね！";
    if (remaining < 0) return `嵐です！⚡ ${topCategory ? `${topCategory.name}を少し控えてみて！` : '全体的に見直しが必要かも！'}`;
    if (remaining < 20000) return `足元注意 🌧️ ${topCategory ? `${topCategory.name}が増えてるね` : '無駄遣いに気をつけて'}`;
    if (remaining < 50000) return `視界不良 ☁️ ${topCategory ? `${topCategory.name}に注意しよう` : '山頂を目指して一歩ずつ'}`;
    return `冒険日和！☀️ ${topCategory ? `${topCategory.name}もいい感じ！` : 'この調子で進みましょう！'}`;
  };

  const progressPercent = (totalExpense / (monthlyBudget || 1)) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: '24px', overflow: 'hidden', background: weather.bgColor, position: 'relative' }}>
      <div className="flex-between">
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: weather.color, letterSpacing: '2px' }}>CONDITION: {weather.label}</p>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{percent.toFixed(1)}% <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>達成中</span></h3>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', opacity: 0.8 }}>合計 ¥{current.toLocaleString()}</p>
        </div>
        <div className="category-icon-box" style={{ background: `${weather.color}15`, color: weather.color }}><weather.icon size={26} /></div>
      </div>
      <div style={{ position: 'relative', height: '160px', marginTop: '20px' }}>
        <svg viewBox="0 0 400 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {weather.type === 'sunny' && <motion.circle animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }} cx="40" cy="40" r="15" fill="#ff9500" opacity="0.3" />}
          <circle cx="280" cy="30" r="10" fill={weather.type === 'stormy' ? '#8e8e93' : '#fff'} />
          {weather.type === 'rainy' && (
             <g opacity="0.3">
               {[...Array(10)].map((_, i) => <motion.line key={i} x1={i*40} y1="0" x2={i*40-10} y2="20" stroke="#5e5ce6" animate={{ y: [0, 160] }} transition={{ repeat: Infinity, duration: 1, delay: i*0.1 }} />)}
             </g>
          )}
          {weather.type === 'stormy' && <motion.path animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2 }} d="M200 20 L180 60 L210 60 L190 100" stroke="#ffcc00" strokeWidth="2" fill="none" />}
          <path d="M-50 160 L200 40 L400 160 Z" fill={weather.type === 'stormy' ? '#48484a' : '#b8e2c8'} opacity="0.3" />
          <path d="M100 160 L350 20 L500 160 Z" fill={weather.type === 'stormy' ? '#48484a' : '#c5eace'} opacity="0.5" />
          <path d="M0 160 Q 150 160, 350 20" fill="none" stroke="#ddd" strokeWidth="3" strokeDasharray="8,8" />
          
          <g transform="translate(350, 20)">
            <rect x="0" y="-35" width="3" height="35" fill="#4a4a4a" rx="1.5" />
            <motion.path 
              animate={{ 
                d: [ "M3 -35 L25 -27 L3 -19 Z", "M3 -35 L28 -25 L3 -19 Z", "M3 -35 L25 -27 L3 -19 Z" ]
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              d="M3 -35 L25 -27 L3 -19 Z" 
              fill="#ff2d55" 
              stroke="#fff"
              strokeWidth="1"
            />
          </g>
          <motion.g animate={{ x: (percent / 100) * 350, y: 160 - (percent / 100) * 140 }} transition={{ type: 'spring', damping: 15 }}>
            <circle r="22" fill={weather.color} opacity="0.1" />
            <rect x="-18" y="-18" width="36" height="36" rx="18" fill="white" stroke={weather.color} strokeWidth="2" />
            <text x="0" y="8" fontSize="20" textAnchor="middle">{progressPercent > 100 ? '😰' : '👪'}</text>
          </motion.g>
        </svg>
      </div>
      <div className="glass" style={{ marginTop: '16px', padding: '12px', background: 'white', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Wind size={16} color={weather.color} />
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: weather.color, margin: 0 }}>{getAdvice()}</p>
      </div>
    </motion.div>
  );
}

// --- Analytics Page ---

function AnalyticsPage({ transactions, categories, currentDate, onMonthChange, onDeleteTransaction }) {
  const [selectedDay, setSelectedDay] = useState(null);
  
  const expenseTransactions = transactions.filter(t => t.type !== 'income');
  const pieData = useMemo(() => categories.map(cat => ({ 
    name: cat.name, 
    value: expenseTransactions.filter(t => t.category === cat.id).reduce((s, t) => s + Number(t.amount), 0), 
    color: cat.color 
  })).filter(d => d.value > 0).sort((a,b)=>b.value-a.value), [expenseTransactions, categories]);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const dailyTotals = useMemo(() => {
    const totals = {};
    expenseTransactions.forEach(t => {
      const d = format(new Date(t.date), 'yyyy-MM-dd');
      totals[d] = (totals[d] || 0) + Number(t.amount);
    });
    return totals;
  }, [expenseTransactions]);

  const isFirstMonth = format(currentDate, 'yyyy-MM') === '2026-04';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8" style={{ paddingBottom: '100px' }}>
      <div className="flex-between">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>分析レポート</h2>
        <div className="glass" style={{ display: 'flex', padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => onMonthChange(subMonths(currentDate, 1))} disabled={isFirstMonth} className="btn-icon" style={{ width: 32, height: 32, opacity: isFirstMonth ? 0.2 : 1 }}><ChevronLeft size={16} /></button>
          <span style={{ padding: '0 12px', fontWeight: 700, fontSize: '0.9rem', alignSelf: 'center' }}>{format(currentDate, 'M月')}</span>
          <button onClick={() => onMonthChange(addMonths(currentDate, 1))} className="btn-icon" style={{ width: 32, height: 32 }}><ChevronRight size={16} /></button>
        </div>
      </div>

      <section className="glass" style={{ padding: '24px', position: 'relative' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} color="var(--primary)" /> カレンダー
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
          {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', paddingBottom: '12px' }}>{d}</div>)}
          {calendarDays.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTxs = expenseTransactions.filter(t => format(new Date(t.date), 'yyyy-MM-dd') === dateStr);
            const total = dayTxs.reduce((s, t) => s + Number(t.amount), 0);
            
            const dayCatTotals = dayTxs.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc; }, {});
            const topCatId = Object.keys(dayCatTotals).reduce((a, b) => dayCatTotals[a] > dayCatTotals[b] ? a : b, null);
            const topCatColor = CATEGORIES.find(c => c.id === topCatId)?.color || 'transparent';

            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            return (
              <motion.div 
                key={i} 
                onClick={() => isCurrentMonth && total > 0 && setSelectedDay(day)}
                whileTap={{ scale: 0.95 }}
                style={{ 
                  aspectRatio: '1/1',
                  borderRadius: '16px',
                  background: isToday ? 'var(--primary)' : (isCurrentMonth ? 'rgba(255,255,255,0.5)' : 'transparent'),
                  border: isToday ? '1px solid var(--primary)' : '1px solid rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isCurrentMonth && total > 0) ? 'pointer' : 'default',
                  opacity: isCurrentMonth ? 1 : 0.2
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isToday ? 'white' : 'var(--text-main)' }}>{format(day, 'd')}</span>
                {total > 0 && isCurrentMonth && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isToday ? 'white' : topCatColor }} />
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-dim)' }}>
                      {total >= 1000 ? Math.floor(total/1000) + 'k' : total}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="glass" style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0', textAlign: 'left' }}>カテゴリーシェア</h3>
        <div style={{ height: 280, width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                {pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} formatter={(v) => `¥${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total</p>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>¥{expenseTransactions.reduce((s,t)=>s+Number(t.amount),0).toLocaleString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
          {pieData.map(d => (
            <div key={d.name} className="glass" style={{ padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
              <span>{d.name}</span>
            </div>
          ))}
        </div>
      </section>

      <AIInsightsSection transactions={transactions} currentDate={currentDate} categories={categories} />

      <AnimatePresence>
        {selectedDay && (
          <DayDetailModal 
            day={selectedDay} 
            transactions={transactions.filter(t => isSameDay(new Date(t.date), selectedDay))} 
            onClose={() => setSelectedDay(null)} 
            onDelete={onDeleteTransaction}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Day Detail Modal ---


function DayDetailModal({ day, transactions, onClose, onDelete }) {
  const total = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + Number(t.amount), 0);
  
  return (
    <div className="modal-overlay centered">
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 50, opacity: 0 }} 
        className="glass-dark modal-content centered" 
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}>DETAIL</p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{format(day, 'M月d日', { locale: ja })} ({format(day, 'E', { locale: ja })})</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div className="glass" style={{ padding: '16px', background: 'white', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>この日の支出合計</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>¥{total.toLocaleString()}</p>
        </div>

        <div className="space-y-4 no-scrollbar" style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
          {transactions.map(tx => (
            <TransactionItem key={tx.id} tx={tx} onDelete={(id) => { onDelete(id); if (transactions.length <= 1) onClose(); }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function TransactionItem({ tx, onDelete }) {
  const isIncome = tx.type === 'income';
  const categoryList = isIncome ? INCOME_CATEGORIES : CATEGORIES;
  const category = categoryList.find(c => c.id === tx.category) || { name: 'その他', icon: MoreHorizontal, color: '#8e8e93' };
  return (
    <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass history-item" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="history-item-left">
        <div className="category-icon-box" style={{ background: `${category.color}20`, color: category.color }}><category.icon size={22} /></div>
        <div>
          <p style={{ fontWeight: 600 }}>{tx.memo || category.name}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{format(new Date(tx.date), 'HH:mm')}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <p style={{ fontWeight: 700, fontSize: '1.2rem', color: isIncome ? '#34c759' : 'var(--text-main)' }}>{isIncome ? '+' : '¥'}{Number(tx.amount).toLocaleString()}</p>
        <button onClick={() => onDelete(tx.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: '8px', cursor: 'pointer', opacity: 0.6 }}><Trash2 size={18} /></button>
      </div>
    </motion.div>
  );
}

function NavButton({ icon: Icon, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        background: 'none', 
        border: 'none', 
        padding: '12px', 
        color: active ? 'var(--primary)' : 'var(--text-dim)', 
        flex: 1, 
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}
    >
      <Icon size={26} />
      {active && (
        <motion.div 
          layoutId="nav-dot"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 0 10px var(--primary)',
            position: 'absolute',
            bottom: '4px'
          }}
        />
      )}
    </button>
  );
}

function AddTransactionModal({ onClose, onAdd }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(type === 'expense' ? 'food' : 'salary');
  const [memo, setMemo] = useState('');
  const currentCategories = type === 'expense' ? CATEGORIES : INCOME_CATEGORIES;
  const quickAmounts = [100, 500, 1000, 3000, 5000, 10000];
  const handleSubmit = (e) => { e.preventDefault(); if (!amount) return; onAdd({ id: Math.random().toString(36).substr(2, 9), type, amount: Number(amount), category, memo, date: new Date().toISOString() }); };
  return (
    <div className="modal-overlay">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="glass-dark modal-content">
        <div className="flex-between" style={{ marginBottom: '24px' }}><h2 style={{ fontSize: '1.5rem' }}>{type === 'expense' ? '支出' : '収入'}を記録</h2><button onClick={onClose} className="btn-icon"><X size={20} /></button></div>
        <div className="glass" style={{ display: 'flex', padding: '4px', borderRadius: '16px', marginBottom: '24px', background: 'rgba(0,0,0,0.03)' }}>
          <button onClick={() => { setType('expense'); setCategory('food'); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, background: type === 'expense' ? 'white' : 'transparent', color: type === 'expense' ? 'var(--primary)' : 'var(--text-dim)', boxShadow: type === 'expense' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>支出</button>
          <button onClick={() => { setType('income'); setCategory('salary'); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, background: type === 'income' ? 'white' : 'transparent', color: type === 'income' ? '#34c759' : 'var(--text-dim)', boxShadow: type === 'income' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>収入</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="input-group"><label className="label-caps">金額 (¥)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="input-main" style={{ color: type === 'expense' ? 'var(--text-main)' : '#34c759' }} /><div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 0' }} className="no-scrollbar">{quickAmounts.map(val => (<button key={val} type="button" onClick={() => setAmount(val.toString())} className="category-chip" style={{ fontSize: '0.8rem' }}>¥{val.toLocaleString()}</button>))}</div></div>
          <div className="input-group">
            <label className="label-caps">カテゴリー</label>
            <div className="category-scroll no-scrollbar">
              {currentCategories.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <motion.button 
                    key={cat.id} 
                    type="button" 
                    onClick={() => setCategory(cat.id)} 
                    className={`category-chip ${isActive ? 'active' : ''}`} 
                    style={{ 
                      background: isActive ? cat.color : 'white',
                      color: isActive ? 'white' : 'var(--text-dim)',
                      borderColor: isActive ? cat.color : 'transparent',
                    }}
                    whileHover={{ 
                      background: isActive ? cat.color : `${cat.color}15`,
                      color: isActive ? 'white' : cat.color,
                      scale: 1.02
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <cat.icon size={16} />
                    <span style={{ fontWeight: 700 }}>{cat.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="input-group"><label className="label-caps">メモ</label><input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモを残す" className="input-text" /></div>
          <button type="submit" className="btn-primary" style={{ background: type === 'income' ? 'linear-gradient(135deg, #34c759, #30b0c7)' : '' }}>保存</button>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsModal({ onClose, budget, goal, baseIncome: initialIncome, transactions, onSave }) {
  const [b, setB] = useState(budget);
  const [g, setG] = useState(goal);
  const [inc, setInc] = useState(initialIncome);

  const autoCalculate = () => {
    const monthlySavings = g / 12;
    const fixedCats = ['housing', 'utilities'];
    const fixedTxs = transactions.filter(t => fixedCats.includes(t.category));
    
    const monthlyFixed = fixedTxs.reduce((acc, t) => {
      const m = format(new Date(t.date), 'yyyy-MM');
      acc[m] = (acc[m] || 0) + Number(t.amount);
      return acc;
    }, {});
    
    const fixedValues = Object.values(monthlyFixed);
    const avgFixed = fixedValues.length > 0 ? (fixedValues.reduce((s,v)=>s+v, 0) / fixedValues.length) : 0;
    
    const suggested = Math.max(0, inc - monthlySavings - avgFixed);
    setB(Math.round(suggested));
  };

  return (
    <div className="modal-overlay">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="glass-dark modal-content">
        <div className="flex-between" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem' }}>プレミアム設定</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        
        <div className="space-y-6">
          <div className="input-group">
            <label className="label-caps">年間貯金目標 (¥)</label>
            <input type="number" value={g} onChange={e => setG(e.target.value)} className="input-main" placeholder="1200000" />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>※月々 ¥{Math.round(g/12).toLocaleString()} の貯金を目指します</p>
          </div>

          <div className="input-group">
            <label className="label-caps">今月の予算設定 (¥)</label>
            <input type="number" value={b} onChange={e => setB(e.target.value)} className="input-main" />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>※給与を入力すると最新の生活コストに基づき自動更新されます</p>
          </div>

          <button onClick={() => onSave(Number(b), Number(g), inc)} className="btn-primary" style={{ marginTop: '20px' }}>設定を保存する</button>
        </div>
      </motion.div>
    </div>
  );
}

function AIInsightsSection({ transactions, currentDate, categories }) {
  const thisMonthStart = startOfMonth(currentDate);
  const lastMonthStart = startOfMonth(subMonths(currentDate, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentDate, 1));

  const thisMonthExpenses = transactions.filter(t => t.type !== 'income' && isWithinInterval(new Date(t.date), { start: thisMonthStart, end: endOfMonth(currentDate) }));
  const lastMonthExpenses = transactions.filter(t => t.type !== 'income' && isWithinInterval(new Date(t.date), { start: lastMonthStart, end: lastMonthEnd }));

  const thisTotal = thisMonthExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const lastTotal = lastMonthExpenses.reduce((s, t) => s + Number(t.amount), 0);

  const diff = thisTotal - lastTotal;
  const percentChange = lastTotal > 0 ? (diff / lastTotal) * 100 : 0;

  // Find biggest increase category
  const getCatTotal = (txs, id) => txs.filter(t => t.category === id).reduce((s, t) => s + Number(t.amount), 0);
  const categoryTrends = categories.map(cat => {
    const t = getCatTotal(thisMonthExpenses, cat.id);
    const l = getCatTotal(lastMonthExpenses, cat.id);
    return { ...cat, diff: t - l, current: t };
  }).sort((a,b) => b.diff - a.diff);

  const worstCat = categoryTrends[0];

  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }} 
      whileInView={{ opacity: 1, scale: 1 }}
      className="glass" 
      style={{ 
        padding: '24px', 
        background: 'linear-gradient(135deg, rgba(175, 82, 222, 0.05) 0%, rgba(255,255,255,1) 100%)',
        border: '1px solid rgba(175, 82, 222, 0.1)'
      }}
    >
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#af52de" /> Lumina AI 診断
        </h3>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#af52de', background: 'rgba(175, 82, 222, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>β Version</span>
      </div>

      <div style={{ textAlign: 'left', spaceY: '12px' }}>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>今月の傾向</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {lastTotal > 0 ? (diff > 0 ? `先月より ¥${diff.toLocaleString()} 増加` : `先月より ¥${Math.abs(diff).toLocaleString()} 節約`) : 'データ収集中...'}
            </span>
            {lastTotal > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: diff > 0 ? 'var(--primary)' : '#34c759' }}>
              ({diff > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
            </span>}
          </div>
        </div>

        {lastTotal > 0 && worstCat && worstCat.diff > 0 && (
          <div className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '4px' }}>⚠️ 要注意カテゴリー</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              <span style={{ color: worstCat.color }}>{worstCat.name}</span> が先月より多くなっています。
            </p>
          </div>
        )}

        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px' }}>💡 来月へのアドバイス</p>
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', spaceY: '8px' }}>
            <li style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', marginBottom: '8px' }}>
              <span>✅</span>
              <span>{worstCat && worstCat.diff > 0 ? `${worstCat.name}の予算を意識して、外食や買い物を週1回減らしてみましょう。` : '現在のペースは非常に良好です！来月も同じリズムを維持しましょう。'}</span>
            </li>
            <li style={{ display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
              <span>✅</span>
              <span>固定費以外で ¥{Math.round(thisTotal * 0.05).toLocaleString()} 程度の削減を目標にすると、山頂（目標）へさらに近づきます。</span>
            </li>
          </ul>
        </div>
      </div>
    </motion.section>
  );
}

// --- Summit Modal (Goal Achievement) ---
function SummitModal({ transactions, onClose }) {
  useEffect(() => {
    playTriumphSound();
    const end = Date.now() + 5 * 1000;
    const colors = ['#ffcc00', '#ffffff', '#ffd700', '#ff9500'];

    (function frame() {
      confetti({ particleCount: 10, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 10, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors });
      confetti({ particleCount: 5, angle: 90, spread: 100, origin: { x: 0.5, y: 0.8 }, colors });

      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }, []);

  const totalSaved = transactions.filter(t => t.type === 'income').reduce((s,t)=>s+Number(t.amount), 0) - 
                     transactions.filter(t => t.type !== 'income').reduce((s,t)=>s+Number(t.amount), 0);

  return (
    <div className="modal-overlay centered" style={{ zIndex: 11000, background: 'radial-gradient(circle, #2c2c2e 0%, #000 100%)' }}>
      <motion.div 
        initial={{ scale: 0, rotate: 720 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 100 }}
        className="glass"
        style={{
          width: '90%',
          maxWidth: '450px',
          padding: '60px 24px',
          textAlign: 'center',
          background: 'rgba(255, 204, 0, 0.1)',
          border: '4px solid #ffcc00',
          boxShadow: '0 0 100px rgba(255, 204, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: -50, width: '100%', textAlign: 'center' }}>
          {[...Array(20)].map((_, i) => (
             <motion.div 
               key={i}
               animate={{ y: [-20, 20], opacity: [0, 1, 0] }}
               transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
               style={{ position: 'absolute', left: `${i * 5}%`, color: '#ffcc00' }}
             ><Sparkles size={10} /></motion.div>
          ))}
        </div>

        <motion.div animate={{ scale: [1, 1.3, 1], filter: 'drop-shadow(0 0 40px #ffcc00)' }} transition={{ repeat: Infinity, duration: 2 }}>
          <Trophy size={140} color="#ffcc00" />
        </motion.div>

        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffcc00', letterSpacing: '8px', marginTop: '30px' }}>ULTIMATE GOAL ACHIEVED</h3>
        <h2 style={{ fontSize: '3.2rem', fontWeight: 900, color: 'white', margin: '16px 0', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>山頂到達！！</h2>
        <p style={{ fontSize: '1.1rem', color: '#ffcc00', fontWeight: 800, marginBottom: '40px' }}>あなたは「伝説の登頂者」です。</p>

        <div className="glass" style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '32px', marginBottom: '48px' }}>
          <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>累計貯金額</p>
          <p style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white' }}>¥{totalSaved.toLocaleString()}</p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.1, boxShadow: '0 0 30px #ffcc00' }}
          onClick={onClose}
          className="btn-primary"
          style={{ background: '#ffcc00', color: 'black', fontWeight: 900, padding: '20px 40px', fontSize: '1.2rem', border: 'none' }}
        >
          新しい冒険（次の目標）へ！
        </motion.button>
      </motion.div>
    </div>
  );
}

// --- Yearly Report Modal (Dec 31st Gimmick) ---
function YearlyReportModal({ transactions, onClose }) {
  useEffect(() => {
    playTriumphSound();
  }, []);
  const currentYear = new Date().getFullYear();
  const yearlyTxs = transactions.filter(t => new Date(t.date).getFullYear() === currentYear);
  
  const income = yearlyTxs.filter(t => t.type === 'income').reduce((s,t)=>s+Number(t.amount), 0);
  const expense = yearlyTxs.filter(t => t.type !== 'income').reduce((s,t)=>s+Number(t.amount), 0);
  const savings = income - expense;

  return (
    <div className="modal-overlay centered" style={{ zIndex: 12000, background: 'linear-gradient(to bottom, #0a0a14 0%, #1a1a2e 100%)' }}>
       {/* Falling Snow/Star effect */}
       {[...Array(30)].map((_, i) => (
        <motion.div 
          key={i}
          animate={{ y: [0, 800], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
          style={{ position: 'absolute', top: -10, left: `${Math.random() * 100}%`, color: 'white', pointerEvents: 'none' }}
        >
          <Sparkles size={8 + Math.random() * 10} />
        </motion.div>
      ))}

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass"
        style={{
          width: '90%',
          maxWidth: '420px',
          padding: '48px 32px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(30px)',
          color: 'white'
        }}
      >
        <CalendarIcon size={48} color="#af52de" style={{ marginBottom: '24px' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.6, letterSpacing: '4px' }}>YEARLY ADVENTURE</h3>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '40px' }}>{currentYear}年 冒険の総括</h2>

        <div className="space-y-6" style={{ textAlign: 'left', marginBottom: '48px' }}>
          <div className="flex-between" style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ opacity: 0.7 }}>総収入</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>¥{income.toLocaleString()}</span>
          </div>
          <div className="flex-between" style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ opacity: 0.7 }}>総支出</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ff2d55' }}>¥{expense.toLocaleString()}</span>
          </div>
          <div className="flex-between" style={{ paddingTop: '8px' }}>
            <span style={{ fontWeight: 800, color: '#34c759' }}>冒険の成果（貯金）</span>
            <span style={{ fontWeight: 900, fontSize: '1.8rem', color: '#34c759' }}>¥{savings.toLocaleString()}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', opacity: 0.6, lineHeight: 1.8, marginBottom: '48px' }}>
          365日の冒険、本当にお疲れ様でした。<br/>
          積み上げた数字は、あなたの努力の結晶です。<br/>
          心地よい余韻とともに、素晴らしい新年をお迎えください。
        </p>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          onClick={onClose}
          className="btn-primary"
          style={{ width: '100%', background: '#af52de', color: 'white', fontWeight: 900, padding: '16px', borderRadius: '16px' }}
        >
          新しい年の冒険へ備える
        </motion.button>
      </motion.div>
    </div>
  );
}

// --- Mission Modal ---
function MissionModal({ mission, onClose }) {
  useEffect(() => {
    playTriumphSound();
  }, []);

  return (
    <div className="modal-overlay centered" style={{ zIndex: 13000 }}>
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="glass-dark"
        style={{
          width: '90%',
          maxWidth: '380px',
          padding: '40px 24px',
          textAlign: 'center',
          color: 'white',
          border: '2px solid #ff9500',
          boxShadow: '0 0 30px rgba(255, 149, 0, 0.2)'
        }}
      >
        <div style={{ background: 'rgba(255, 149, 0, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <mission.icon size={40} color="#ff9500" />
        </div>
        
        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ff9500', letterSpacing: '4px', marginBottom: '8px' }}>NEW MISSION</h3>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '24px' }}>{mission.title}</h2>
        
        <div className="glass" style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', marginBottom: '32px' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{mission.desc}</p>
        </div>

        <button 
          onClick={onClose}
          className="btn-primary"
          style={{ width: '100%', background: '#ff9500', color: 'black', fontWeight: 800, padding: '16px', borderRadius: '16px' }}
        >
          任務を開始する
        </button>
      </motion.div>
    </div>
  );
}

export default App;
