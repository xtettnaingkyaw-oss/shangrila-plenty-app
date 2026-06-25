import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Home, FilePlus, ClipboardList, Trash2, X, Share2, Download, CheckCircle, Calendar, Wallet, Banknote } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyA7wnYTB2uevwYl3atyTJ2EZSFc8r65eR4",
  authDomain: "shangrila-app-eff40.firebaseapp.com",
  projectId: "shangrila-app-eff40",
  storageBucket: "shangrila-app-eff40.firebasestorage.app",
  messagingSenderId: "608642199100",
  appId: "1:608642199100:web:9d59a6f41903f12a779d39",
  measurementId: "G-YWGGEEDM2F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const THERAPISTS = Array.from({ length: 15 }, (_, i) => ({ id: (i + 1).toString(), name: `Therapist No-${i + 1}` }));
const CATEGORIES = ["ဆိုင်သန့်ရှင်းရေးတာဝန် ပျက်ကွက်ခြင်း", "Out Pass စည်းကမ်းများ", "Jibble Clock In/ Clock Out စည်းကမ်းများ", "ဆူညံခြင်း၊ ဂိမ်းကစားခြင်း၊ စလော့ဆော့ခြင်း", "ဧည့်သည်အား ဝန်ဆောင်မှုအားနည်းခြင်း", "စည်းကမ်းမဲ့ ဆေးလိပ်၊ အရက်၊ မူးယစ်ဆေးသုံးခြင်း၊ ဝန်ထမ်းအချင်းချင်း ရန်ဖြစ်ခြင်း", "မီးဖိုချောင်စည်းကမ်း ဖောက်ဖျက်ခြင်း", "အိပ်ချိန်စည်းကမ်း ဖောက်ဖျက်ခြင်း", "အခြား ဖောက်ဖျက်မှုများ"];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [penalties, setPenalties] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]); 
  const [loans, setLoans] = useState<any[]>([]); 
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  
  const [formData, setFormData] = useState({ therapistId: '1', category: CATEGORIES[0], amount: '', remark: '', date: new Date().toISOString().split('T')[0] });
  const [depositForm, setDepositForm] = useState({ therapistId: '1', amount: '', note: '' });
  
  // ကြိုထုတ်ငွေအတွက် Form State အသစ်
  const [loanForm, setLoanForm] = useState({ 
    therapistId: '1', 
    amount: '', 
    note: '', 
    date: new Date().toISOString().split('T')[0],
    type: 'borrow', // 'borrow' = ကြိုထုတ်, 'repay' = ပြန်ဆပ်
    repayMethod: 'cash' // 'cash' = လက်ငင်း, 'salary' = လစာဖြတ်
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const lastDayOfMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();
  
  const [startDate, setStartDate] = useState(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-${currentMonth}-${lastDayOfMonth}`);

  useEffect(() => {
    if (window.location.search.includes('mode=public')) setIsPublic(true);
    signInAnonymously(auth);
    
    const qPenalties = query(collection(db, 'penalties'), orderBy('createdAt', 'desc'));
    const unsubP = onSnapshot(qPenalties, (snapshot) => setPenalties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    const qDeposits = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'));
    const unsubD = onSnapshot(qDeposits, (snapshot) => setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    const qLoans = query(collection(db, 'loans'), orderBy('createdAt', 'desc'));
    const unsubL = onSnapshot(qLoans, (snapshot) => setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    return () => { unsubP(); unsubD(); unsubL(); };
  }, []);

  const filteredPenalties = penalties.filter(p => {
    const pDate = p.date;
    return (!startDate || pDate >= startDate) && (!endDate || pDate <= endDate);
  });

  const filteredLoans = loans.filter(l => {
    const lDate = l.date;
    return (!startDate || lDate >= startDate) && (!endDate || lDate <= endDate);
  });

  const getDaysOverdue = (dateStr: string) => {
    const dToday = new Date();
    dToday.setHours(0, 0, 0, 0);
    const pDate = new Date(dateStr);
    pDate.setHours(0, 0, 0, 0);
    const diffTime = dToday.getTime() - pDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateAmount = (p: any) => {
    if (p.isPaid) return Number(p.finalAmount || p.amount); 
    const days = getDaysOverdue(p.date);
    return Number(p.amount) * Math.pow(2, days); 
  };

  const getStats = (id: string) => {
    const p = filteredPenalties.filter(item => String(item.therapistId) === id);
    const unpaid = p.filter(item => !item.isPaid);
    const paid = p.filter(item => item.isPaid);
    
    const totalUnpaid = unpaid.reduce((sum, item) => sum + calculateAmount(item), 0);
    const totalPaid = paid.reduce((sum, item) => sum + calculateAmount(item), 0);
    
    // အပ်ငွေနှင့် ကြိုထုတ်ငွေ လက်ကျန်များကို Date Filter မလုပ်ဘဲ အချိန်ပြည့် (Lifetime Balance) တွက်ချက်သည်
    const d_all = deposits.filter(item => String(item.therapistId) === id);
    const depositBalance = d_all.reduce((sum, item) => sum + Number(item.amount), 0);

    const l_all = loans.filter(item => String(item.therapistId) === id);
    const totalLoan = l_all.reduce((sum, item) => sum + Number(item.amount), 0);
    
    // Modal တွင်ပြရန် Date Filter လုပ်ထားသော မှတ်တမ်းများ
    const l_filtered = filteredLoans.filter(item => String(item.therapistId) === id);

    return { count: p.length, unpaidCount: unpaid.length, totalUnpaid, totalPaid, depositBalance, totalLoan, list: p, loanList: l_filtered };
  };

  const handleSubmitPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.amount) return alert("ပမာဏဖြည့်ပါ");
    await addDoc(collection(db, 'penalties'), { 
      ...formData, 
      amount: Number(formData.amount), 
      therapistName: THERAPISTS.find(t=>t.id===formData.therapistId)?.name, 
      isPaid: false, 
      createdAt: Date.now() 
    });
    setFormData({...formData, amount: '', remark: ''});
    alert("ဒဏ်ကြေး မှတ်တမ်းတင်ပြီးပါပြီ");
    setActiveTab('dashboard');
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!depositForm.amount) return alert("ပမာဏဖြည့်ပါ");
    await addDoc(collection(db, 'deposits'), {
      therapistId: depositForm.therapistId,
      amount: Number(depositForm.amount), 
      date: new Date().toISOString().split('T')[0],
      type: 'deposit',
      note: depositForm.note || 'အပ်ငွေသွင်းခြင်း',
      createdAt: Date.now()
    });
    setDepositForm({...depositForm, amount: '', note: ''});
    alert("အပ်ငွေ မှတ်တမ်းတင်ပြီးပါပြီ");
  };

  // ကြိုထုတ်ငွေ / ပြန်ဆပ်ငွေ တွက်ချက်သိမ်းဆည်းခြင်း
  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!loanForm.amount) return alert("ပမာဏဖြည့်ပါ");
    
    const amountNum = Number(loanForm.amount);
    let finalAmount = amountNum;
    let finalNote = loanForm.note;

    if (loanForm.type === 'repay') {
      const currentBalance = getStats(loanForm.therapistId).totalLoan;
      
      if (amountNum > currentBalance) {
        return alert(`လက်ကျန် ကြိုထုတ်ငွေ (${currentBalance.toLocaleString()} Ks) ထက် ကျော်လွန်၍ ဆပ်၍မရပါ။`);
      }
      
      finalAmount = -amountNum; // ပြန်ဆပ်ငွေဖြစ်၍ အနှုတ်ကိန်းဖြစ်ရမည်
      
      // မှတ်ချက် မရေးထားပါက Default အလိုအလျောက် ဖြည့်ပေးမည်
      if (!finalNote) {
        finalNote = loanForm.repayMethod === 'cash' ? 'လက်ငင်းငွေဖြင့် ပြန်ဆပ်သည်' : 'လစာထဲမှ နှုတ်၍ ပြန်ဆပ်သည်';
      } else {
        finalNote = (loanForm.repayMethod === 'cash' ? '[လက်ငင်း] ' : '[လစာဖြတ်] ') + finalNote;
      }
    } else {
      if (!finalNote) finalNote = 'ကြိုထုတ်ငွေ';
    }

    await addDoc(collection(db, 'loans'), {
      therapistId: loanForm.therapistId,
      amount: finalAmount, 
      date: loanForm.date,
      type: loanForm.type,
      repayMethod: loanForm.type === 'repay' ? loanForm.repayMethod : null,
      note: finalNote,
      createdAt: Date.now()
    });
    
    setLoanForm({...loanForm, amount: '', note: ''});
    alert("မှတ်တမ်းတင်ပြီးပါပြီ");
  };

  const handleMarkAsPaid = async (p: any, method: 'cash' | 'deposit') => {
    const currentAmt = calculateAmount(p);
    
    if (method === 'deposit') {
      const d = deposits.filter(item => String(item.therapistId) === String(p.therapistId));
      const depositBalance = d.reduce((sum, item) => sum + Number(item.amount), 0);
      
      if (depositBalance < currentAmt) {
        alert(`အပ်ငွေလက်ကျန် (${depositBalance.toLocaleString()} Ks) မလုံလောက်ပါ။ လက်ငင်းသာ ပေးဆောင်နိုင်ပါမည်။`);
        return;
      }
      
      if(window.confirm(`အပ်ငွေထဲမှ ${currentAmt.toLocaleString()} Ks နှုတ်မည်မှာ သေချာပါသလား?`)) {
        await addDoc(collection(db, 'deposits'), {
          therapistId: p.therapistId,
          amount: -currentAmt,
          date: new Date().toISOString().split('T')[0],
          type: 'deduction',
          note: `${p.date} ရက်စွဲပါ ဒဏ်ကြေး ဖြတ်တောက်ခြင်း`,
          createdAt: Date.now()
        });
        
        await updateDoc(doc(db, 'penalties', p.id), {
          isPaid: true,
          paidMethod: 'deposit',
          finalAmount: currentAmt,
          paidDate: new Date().toISOString().split('T')[0]
        });
      }
    } else {
      if(window.confirm(`လက်ငင်းငွေ ${currentAmt.toLocaleString()} Ks ပေးဆောင်မည်မှာ သေချာပါသလား?`)) {
        await updateDoc(doc(db, 'penalties', p.id), {
          isPaid: true,
          paidMethod: 'cash',
          finalAmount: currentAmt,
          paidDate: new Date().toISOString().split('T')[0]
        });
      }
    }
  };

  const handlePrintPDF = () => window.print();

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { display: block !important; width: 100%; }
          body { background-color: white; }
        }
      `}</style>

      <nav className="bg-emerald-900 text-white p-4 flex justify-between shadow-lg sticky top-0 z-50 no-print overflow-x-auto">
        <h1 className="font-bold text-xl whitespace-nowrap mr-4">THE SHANGRI-LA</h1>
        {!isPublic && (
          <div className="flex gap-4 items-center">
            <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-amber-400' : 'hover:text-amber-200'} title="ပင်မစာမျက်နှာ"><Home size={20}/></button>
            <button onClick={() => setActiveTab('add')} className={activeTab === 'add' ? 'text-amber-400' : 'hover:text-amber-200'} title="ဒဏ်ကြေးသွင်းရန်"><FilePlus size={20}/></button>
            <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'text-amber-400' : 'hover:text-amber-200'} title="မှတ်တမ်းများ"><ClipboardList size={20}/></button>
            <button onClick={() => setActiveTab('deposits')} className={activeTab === 'deposits' ? 'text-amber-400' : 'hover:text-amber-200'} title="အပ်ငွေစီမံရန်"><Wallet size={20}/></button>
            <button onClick={() => setActiveTab('loans')} className={activeTab === 'loans' ? 'text-amber-400' : 'hover:text-amber-200'} title="ချေးငွေ/ကြိုထုတ်ငွေ"><Banknote size={20}/></button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.origin + '?mode=public'); alert("Link ကူးယူပြီးပါပြီ")}} className="hover:text-amber-200" title="Link ကူးယူရန်"><Share2 size={20}/></button>
          </div>
        )}
      </nav>

      <main className="p-4 max-w-4xl mx-auto print-section">
        
        {(activeTab === 'dashboard' || activeTab === 'history' || activeTab === 'loans') && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between no-print">
            <h2 className="font-bold text-emerald-900 flex items-center gap-2"><Calendar size={20} /> ရက်စွဲအလိုက် ကြည့်ရန်</h2>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <input type="date" className="border border-slate-300 p-2 rounded outline-none focus:ring-2 focus:ring-emerald-500 text-sm w-full sm:w-auto" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-slate-500 font-bold">-</span>
              <input type="date" className="border border-slate-300 p-2 rounded outline-none focus:ring-2 focus:ring-emerald-500 text-sm w-full sm:w-auto" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
            {THERAPISTS.map(t => {
              const stats = getStats(t.id);
              const hasUnpaid = stats.unpaidCount > 0;
              const hasPaidOnly = stats.unpaidCount === 0 && stats.count > 0;
              
              const cardClass = hasUnpaid 
                ? 'border-red-500 bg-red-50' 
                : hasPaidOnly 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-emerald-600 bg-white';

              return (
                <div key={t.id} onClick={() => setSelectedTherapist({...t, ...stats})} 
                     className={`p-4 pt-6 rounded-xl shadow border-l-8 cursor-pointer hover:opacity-80 relative overflow-hidden transition-colors ${cardClass}`}>
                  
                  {stats.depositBalance > 0 && <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-br-lg font-bold shadow">အပ်ငွေ: {stats.depositBalance.toLocaleString()} Ks</div>}

                  {hasUnpaid && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold shadow">ဒဏ်ကြေးရှိ</div>}
                  {hasPaidOnly && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold shadow">ဒဏ်ကြေးဆောင်ပြီး</div>}
                  
                  <h3 className="font-bold text-emerald-900 text-lg mt-1">
                    {t.name}
                  </h3>
                  
                  <div className="mt-2 space-y-0.5">
                    {stats.totalUnpaid > 0 && <p className="text-sm font-bold text-red-600">မဆောင်ရသေး: {stats.totalUnpaid.toLocaleString()} Ks ({stats.unpaidCount} ခု)</p>}
                    {stats.totalPaid > 0 && <p className="text-sm font-bold text-emerald-800">ပေးဆောင်ပြီး: {stats.totalPaid.toLocaleString()} Ks</p>}
                    {stats.totalLoan > 0 && <p className="text-sm font-bold text-purple-700">ကြိုထုတ်ငွေ: {stats.totalLoan.toLocaleString()} Ks</p>}
                    {stats.count === 0 && stats.totalLoan === 0 && <p className="text-sm font-bold text-emerald-700 mt-2 opacity-70">မှတ်တမ်းမရှိပါ</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'add' && !isPublic && (
          <form onSubmit={handleSubmitPenalty} className="bg-white p-6 rounded-xl shadow space-y-4 no-print">
            <h2 className="font-bold text-emerald-900 text-lg">ဒဏ်ကြေးအသစ် မှတ်တမ်းတင်ရန်</h2>
            <select className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-emerald-500" onChange={e => setFormData({...formData, therapistId: e.target.value})}>{THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="date" className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-emerald-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required/>
            <select className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-emerald-500" onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input type="number" placeholder="အခြေခံပမာဏ (ကျပ်)" className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-emerald-500" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="0"/>
            <textarea placeholder="မှတ်ချက်" className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-emerald-500" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} />
            <button className="w-full bg-emerald-900 hover:bg-emerald-800 transition-colors text-white p-3 rounded font-bold">မှတ်တမ်းတင်မည်</button>
          </form>
        )}

        {activeTab === 'deposits' && !isPublic && (
          <div className="space-y-6 no-print">
            <form onSubmit={handleSubmitDeposit} className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="font-bold text-blue-900 text-lg flex items-center gap-2"><Wallet/> အပ်ငွေသွင်းရန်</h2>
              <select className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setDepositForm({...depositForm, therapistId: e.target.value})} value={depositForm.therapistId}>{THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <input type="number" placeholder="အပ်ငွေပမာဏ (ကျပ်)" className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={depositForm.amount} onChange={e => setDepositForm({...depositForm, amount: e.target.value})} required min="0"/>
              <input type="text" placeholder="မှတ်ချက် (ဥပမာ- ကြိုတင်အပ်ငွေ)" className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-blue-500" value={depositForm.note} onChange={e => setDepositForm({...depositForm, note: e.target.value})} />
              <button className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white p-3 rounded font-bold">အပ်ငွေ စာရင်းသွင်းမည်</button>
            </form>

            <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
              <h3 className="p-4 bg-slate-50 font-bold text-slate-700 border-b">အပ်ငွေ / အနှုတ် မှတ်တမ်းများ</h3>
              <table className="w-full text-sm">
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-bold">{d.date}</span><br/>
                        <span className="text-emerald-900 font-bold text-xs">{THERAPISTS.find(t=>t.id===d.therapistId)?.name}</span>
                      </td>
                      <td className="p-3 text-slate-600">{d.note}</td>
                      <td className={`p-3 text-right font-bold ${d.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {d.amount > 0 ? '+' : ''}{Number(d.amount).toLocaleString()} Ks
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => {if(window.confirm('ဖျက်ရန်သေချာပါသလား?')) deleteDoc(doc(db, 'deposits', d.id));}} className="text-slate-400 hover:text-red-600 p-1">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {deposits.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">မှတ်တမ်းမရှိသေးပါ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ကြိုထုတ်ငွေ / ပြန်ဆပ်ငွေ Tab အသစ် */}
        {activeTab === 'loans' && !isPublic && (
          <div className="space-y-6 no-print">
            <form onSubmit={handleSubmitLoan} className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="font-bold text-purple-900 text-lg flex items-center gap-2 mb-2"><Banknote/> ကြိုထုတ်ငွေ / ပြန်ဆပ်ငွေ မှတ်တမ်း</h2>
              
              {/* Type Selection */}
              <div className="flex gap-6 border-b border-slate-200 pb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="loanType" checked={loanForm.type === 'borrow'} onChange={() => setLoanForm({...loanForm, type: 'borrow'})} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                  <span className="font-bold text-purple-900">ငွေကြိုထုတ်မည်</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="loanType" checked={loanForm.type === 'repay'} onChange={() => setLoanForm({...loanForm, type: 'repay'})} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                  <span className="font-bold text-emerald-700">ပြန်ဆပ်မည်</span>
                </label>
              </div>

              <select className={`w-full p-3 border rounded outline-none focus:ring-2 ${loanForm.type === 'borrow' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'}`} onChange={e => setLoanForm({...loanForm, therapistId: e.target.value})} value={loanForm.therapistId}>{THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              
              <input type="date" className={`w-full p-3 border rounded outline-none focus:ring-2 ${loanForm.type === 'borrow' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'}`} value={loanForm.date} onChange={e => setLoanForm({...loanForm, date: e.target.value})} required/>
              
              {/* ပြန်ဆပ်မည်ဆိုလျှင် နည်းလမ်းရွေးရန် */}
              {loanForm.type === 'repay' && (
                <select className="w-full p-3 border rounded outline-none focus:ring-2 focus:ring-emerald-500" value={loanForm.repayMethod} onChange={e => setLoanForm({...loanForm, repayMethod: e.target.value})}>
                  <option value="cash">လက်ငင်းငွေဖြင့် ပြန်ဆပ်မည်</option>
                  <option value="salary">လစာထဲမှ နှုတ်၍ ပြန်ဆပ်မည်</option>
                </select>
              )}

              <input type="number" placeholder={loanForm.type === 'borrow' ? "ကြိုထုတ်ငွေပမာဏ (ကျပ်)" : "ပြန်ဆပ်မည့်ပမာဏ (ကျပ်)"} className={`w-full p-3 border rounded outline-none focus:ring-2 ${loanForm.type === 'borrow' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'}`} value={loanForm.amount} onChange={e => setLoanForm({...loanForm, amount: e.target.value})} required min="0"/>
              
              <input type="text" placeholder="မှတ်ချက် (ရွေးချယ်ရန်)" className={`w-full p-3 border rounded outline-none focus:ring-2 ${loanForm.type === 'borrow' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'}`} value={loanForm.note} onChange={e => setLoanForm({...loanForm, note: e.target.value})} />
              
              <button className={`w-full transition-colors text-white p-3 rounded font-bold ${loanForm.type === 'borrow' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {loanForm.type === 'borrow' ? 'ကြိုထုတ်ငွေ စာရင်းသွင်းမည်' : 'ပြန်ဆပ်ငွေ စာရင်းသွင်းမည်'}
              </button>
            </form>

            <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
              <h3 className="p-4 bg-purple-50 font-bold text-purple-900 border-b flex justify-between">
                <span>ကြိုထုတ်ငွေ / ပြန်ဆပ်ငွေ မှတ်တမ်းများ</span>
                <button onClick={handlePrintPDF} className="no-print bg-purple-600 hover:bg-purple-700 transition-colors text-white px-3 py-1 rounded text-xs flex items-center gap-1 shadow">
                  <Download size={12}/> PDF ထုတ်ယူမည်
                </button>
              </h3>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-600">
                  <tr>
                    <th className="p-3 text-left">ရက်စွဲ / အမည်</th>
                    <th className="p-3 text-left">အမျိုးအစား/မှတ်ချက်</th>
                    <th className="p-3 text-right">ပမာဏ</th>
                    <th className="p-3 text-center">ဖျက်ရန်</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map(l => (
                    <tr key={l.id} className="border-b hover:bg-purple-50 transition-colors">
                      <td className="p-3">
                        <span className="font-bold">{l.date}</span><br/>
                        <span className="text-emerald-900 font-bold text-xs">{THERAPISTS.find(t=>t.id===l.therapistId)?.name}</span>
                      </td>
                      <td className="p-3">
                        {l.amount < 0 ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold mr-2">ပြန်ဆပ်</span>
                        ) : (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold mr-2">ကြိုထုတ်</span>
                        )}
                        <span className="text-slate-600">{l.note}</span>
                      </td>
                      <td className={`p-3 text-right font-bold ${l.amount > 0 ? 'text-purple-700' : 'text-emerald-600'}`}>
                        {l.amount > 0 ? '+' : ''}{Number(l.amount).toLocaleString()} Ks
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => {if(window.confirm('ဖျက်ရန်သေချာပါသလား?')) deleteDoc(doc(db, 'loans', l.id));}} className="text-slate-400 hover:text-red-600 p-1">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLoans.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">ဤရက်စွဲအတွင်း မှတ်တမ်းမရှိသေးပါ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {!isPublic && (
              <button onClick={handlePrintPDF} className="no-print bg-red-600 hover:bg-red-700 transition-colors text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow">
                <Download size={16}/> PDF ထုတ်ယူမည်
              </button>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50 border-b border-emerald-100 uppercase font-bold text-emerald-900">
                  <tr>
                    <th className="p-4 text-left">ရက်စွဲ</th>
                    <th className="p-4 text-left">အမည်</th>
                    <th className="p-4 text-left">အမျိုးအစား/မှတ်ချက်</th>
                    <th className="p-4 text-right">ကျသင့်ငွေ</th>
                    {!isPublic && <th className="p-4 text-center no-print">လုပ်ဆောင်ချက်</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPenalties.map(p => {
                    const days = getDaysOverdue(p.date);
                    const amount = calculateAmount(p);
                    const isOverdue = !p.isPaid && days > 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold">{p.date}</div>
                          <div className="mt-1">
                            {p.isPaid ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.paidMethod === 'deposit' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.paidMethod === 'deposit' ? 'အပ်ငွေမှ နှုတ်ပြီး' : 'ပေးပြီး'}
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isOverdue ? `လွန်နေသည် (${days} ရက်)` : 'ယနေ့ဆောင်ရန်'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-emerald-900">{p.therapistName}</td>
                        <td className="p-4">
                          <p>{p.category}</p>
                          {p.remark && <p className="text-red-600 font-bold text-xs mt-1">- {p.remark}</p>}
                        </td>
                        <td className={`p-4 text-right font-bold ${p.isPaid ? (p.paidMethod === 'deposit' ? 'text-blue-700' : 'text-emerald-600') : 'text-red-600'}`}>
                          {amount.toLocaleString()} Ks
                        </td>
                        {!isPublic && (
                          <td className="p-4 text-center no-print">
                            <div className="flex justify-center gap-2">
                              {!p.isPaid && (
                                <>
                                  <button onClick={() => handleMarkAsPaid(p, 'cash')} className="text-emerald-500 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded-full" title="လက်ငင်းငွေ ပေးမည်">
                                    <CheckCircle size={18}/>
                                  </button>
                                  <button onClick={() => handleMarkAsPaid(p, 'deposit')} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-full" title="အပ်ငွေထဲမှ နှုတ်မည်">
                                    <Wallet size={18}/>
                                  </button>
                                </>
                              )}
                              <button onClick={() => {if(window.confirm('ဖျက်ရန်သေချာပါသလား?')) deleteDoc(doc(db, 'penalties', p.id));}} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-full ml-1" title="ဖျက်ရန်">
                                <Trash2 size={18}/>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredPenalties.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">ဤရက်စွဲအတွင်း မှတ်တမ်း မရှိပါ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedTherapist && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 relative shadow-2xl max-h-[90vh] flex flex-col">
            <button onClick={() => setSelectedTherapist(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full z-10"><X size={20}/></button>
            <h2 className="font-bold text-emerald-900 text-lg border-b pb-3 mb-4 flex justify-between pr-8">
              {selectedTherapist.name}
              {selectedTherapist.depositBalance > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">အပ်ငွေ: {selectedTherapist.depositBalance.toLocaleString()}</span>}
            </h2>
            
            <div className="overflow-y-auto pr-2 custom-scrollbar">
              
              {/* ဒဏ်ကြေးမှတ်တမ်းများ */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 mb-3">ဒဏ်ကြေးမှတ်တမ်း</h3>
                <div className="space-y-3">
                  {selectedTherapist.list.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2">ဤရက်စွဲအတွင်း မှတ်တမ်းမရှိပါ။</p>
                  ) : (
                    selectedTherapist.list.map((p: any) => {
                      const days = getDaysOverdue(p.date);
                      const amount = calculateAmount(p);
                      
                      const boxBgClass = p.isPaid 
                        ? (p.paidMethod === 'deposit' ? 'border-blue-200 bg-blue-50 opacity-90' : 'border-emerald-200 bg-emerald-50 opacity-90') 
                        : 'border-red-200 bg-red-50';
                        
                      const amtColor = p.isPaid 
                        ? (p.paidMethod === 'deposit' ? 'text-blue-700' : 'text-emerald-700') 
                        : 'text-red-600';

                      return (
                        <div key={p.id} className={`border p-3 rounded-lg flex flex-col gap-1 ${boxBgClass}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-sm">{p.date}</span>
                            <span className={`font-bold ${amtColor}`}>{amount.toLocaleString()} Ks</span>
                          </div>
                          <p className="text-slate-700 text-sm">{p.category}</p>
                          
                          {p.remark && <p className="text-red-600 font-bold text-xs mt-1">- {p.remark}</p>}
                          
                          <div className="flex justify-between items-center mt-1 border-t border-slate-200 pt-2">
                            <span className="text-xs font-bold text-slate-500">
                              {p.isPaid ? (
                                 <span className={p.paidMethod === 'deposit' ? "text-blue-700" : "text-emerald-700"}>
                                   ✓ {p.paidMethod === 'deposit' ? 'အပ်ငွေမှနှုတ်ပြီး' : 'ပေးဆောင်ပြီး'} ({p.paidDate})
                                 </span>
                              ) : (
                                 <span className={days > 0 ? 'text-red-600' : 'text-amber-600'}>
                                   {days > 0 ? `! ရက်လွန်နေသည် (${days} ရက်)` : '• ယနေ့ဆောင်ရန်'}
                                 </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ကြိုထုတ်ငွေ မှတ်တမ်းများ */}
              {selectedTherapist.loanList && selectedTherapist.loanList.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-bold text-purple-800 mb-3 flex justify-between">
                    ကြိုထုတ်ငွေ / ပြန်ဆပ်ငွေ မှတ်တမ်း
                    {selectedTherapist.totalLoan > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">လက်ကျန်: {selectedTherapist.totalLoan.toLocaleString()} Ks</span>}
                  </h3>
                  <div className="space-y-3">
                    {selectedTherapist.loanList.map((loan: any) => (
                      <div key={loan.id} className={`border p-3 rounded-lg flex flex-col gap-1 ${loan.amount > 0 ? 'border-purple-200 bg-purple-50' : 'border-emerald-200 bg-emerald-50 opacity-90'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 text-sm">{loan.date}</span>
                          <span className={`font-bold ${loan.amount > 0 ? 'text-purple-700' : 'text-emerald-700'}`}>
                            {loan.amount > 0 ? '' : '-'}{Math.abs(Number(loan.amount)).toLocaleString()} Ks
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm flex items-center gap-2">
                          {loan.amount < 0 ? (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">ပြန်ဆပ်</span>
                          ) : (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">ကြိုထုတ်</span>
                          )}
                          {loan.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
