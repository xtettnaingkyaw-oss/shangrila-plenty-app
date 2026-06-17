import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Home, FilePlus, ClipboardList, Trash2, X, Share2, Download, CheckCircle } from 'lucide-react';

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
const CATEGORIES = ["သန့်ရှင်းရေးတာဝန် ပျက်ကွက်ခြင်း", "ခွင့်ပြုချက်မရှိဘဲ အပြင်ထွက်ခြင်း", "ဆူညံခြင်း", "ဧည့်သည်အား ဝန်ဆောင်မှုအားနည်းခြင်း", "စည်းကမ်းမဲ့ ဆေးလိပ်၊ အရက်၊ မူးယစ်ဆေးသုံးခြင်း", "မီးဖိုချောင်စည်းကမ်း ဖောက်ဖျက်ခြင်း", "အိပ်ချိန်စည်းကမ်း ဖောက်ဖျက်ခြင်း", "အခြား ဖောက်ဖျက်မှုများ"];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [penalties, setPenalties] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  const [formData, setFormData] = useState({ therapistId: '1', category: CATEGORIES[0], amount: '', remark: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (window.location.search.includes('mode=public')) setIsPublic(true);
    signInAnonymously(auth);
    const q = query(collection(db, 'penalties'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPenalties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // ရက်လွန်တွက်ချက်သည့် Function (၁ ရက်လွန် = ၂ ဆ၊ ၂ ရက်လွန် = ၄ ဆ)
  const getDaysOverdue = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(dateStr);
    pDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - pDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateAmount = (p: any) => {
    if (p.isPaid) return Number(p.finalAmount || p.amount); // ပေးပြီးသားဆိုရင် ပေးခဲ့တဲ့ပမာဏကိုပဲ ယူမည်
    const days = getDaysOverdue(p.date);
    return Number(p.amount) * Math.pow(2, days); // ဆတိုးတွက်ခြင်း
  };

  const getStats = (id: string) => {
    const p = penalties.filter(item => String(item.therapistId) === id);
    const unpaid = p.filter(item => !item.isPaid);
    const paid = p.filter(item => item.isPaid);
    
    const totalUnpaid = unpaid.reduce((sum, item) => sum + calculateAmount(item), 0);
    const totalPaid = paid.reduce((sum, item) => sum + calculateAmount(item), 0);
    
    return { count: p.length, unpaidCount: unpaid.length, totalUnpaid, totalPaid, list: p };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.amount) return alert("ပမာဏဖြည့်ပါ");
    await addDoc(collection(db, 'penalties'), { 
      ...formData, 
      amount: Number(formData.amount), 
      therapistName: THERAPISTS.find(t=>t.id===formData.therapistId)?.name, 
      isPaid: false, // အသစ်ဆိုလျှင် မဆောင်ရသေးဟု မှတ်မည်
      createdAt: Date.now() 
    });
    setFormData({...formData, amount: '', remark: ''});
    alert("မှတ်တမ်းတင်ပြီးပါပြီ");
    setActiveTab('dashboard');
  };

  const handleMarkAsPaid = async (p: any) => {
    const currentAmt = calculateAmount(p);
    if(window.confirm(`ပေးဆောင်ရမည့် ဒဏ်ကြေးပမာဏမှာ ${currentAmt.toLocaleString()} Ks ဖြစ်ပါသည်။\nငွေရှင်းပြီးကြောင်း မှတ်သားမည်လား?`)) {
      await updateDoc(doc(db, 'penalties', p.id), {
        isPaid: true,
        finalAmount: currentAmt,
        paidDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { display: block !important; width: 100%; }
          body { background-color: white; }
        }
      `}</style>

      <nav className="bg-emerald-900 text-white p-4 flex justify-between shadow-lg sticky top-0 z-50 no-print">
        <h1 className="font-bold text-xl">THE SHANGRI-LA</h1>
        {!isPublic && (
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-amber-400' : ''}><Home/></button>
            <button onClick={() => setActiveTab('add')} className={activeTab === 'add' ? 'text-amber-400' : ''}><FilePlus/></button>
            <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'text-amber-400' : ''}><ClipboardList/></button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.origin + '?mode=public'); alert("Link ကူးယူပြီးပါပြီ")}}><Share2/></button>
          </div>
        )}
      </nav>

      <main className="p-4 max-w-4xl mx-auto print-section">
        
        {/* Dashboard Section */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
            {THERAPISTS.map(t => {
              const stats = getStats(t.id);
              const isRed = stats.unpaidCount > 0; // မဆောင်ရသေးတဲ့ ဒဏ်ကြေးရှိမှ အနီပြမည်
              return (
                <div key={t.id} onClick={() => setSelectedTherapist({...t, ...stats})} 
                     className={`p-4 rounded-xl shadow border-l-8 cursor-pointer hover:bg-emerald-50 relative overflow-hidden ${isRed ? 'border-red-500 bg-red-50' : 'border-emerald-600 bg-white'}`}>
                  
                  {/* နဂိုအတိုင်း အနီရောင် Box လေး */}
                  {isRed && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">ဒဏ်ကြေးရှိ</div>}
                  
                  {/* နဂိုအတိုင်း အစိမ်းရောင် Bold နာမည် */}
                  <h3 className="font-bold text-emerald-900 text-lg">{t.name}</h3>
                  
                  <div className="mt-1 space-y-0.5">
                    {stats.totalUnpaid > 0 && <p className="text-sm font-bold text-red-600">မဆောင်ရသေး: {stats.totalUnpaid.toLocaleString()} Ks ({stats.unpaidCount} ခု)</p>}
                    <p className="text-sm font-bold text-emerald-800">စုစုပေါင်း ပေးပြီး: {stats.totalPaid.toLocaleString()} Ks</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Form Section */}
        {activeTab === 'add' && !isPublic && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4 no-print">
            <h2 className="font-bold text-emerald-900 text-lg">ဒဏ်ကြေးအသစ် မှတ်တမ်းတင်ရန်</h2>
            <select className="w-full p-3 border rounded" onChange={e => setFormData({...formData, therapistId: e.target.value})}>{THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="date" className="w-full p-3 border rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            <select className="w-full p-3 border rounded" onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input type="number" placeholder="အခြေခံပမာဏ (ကျပ်)" className="w-full p-3 border rounded" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            <textarea placeholder="မှတ်ချက်" className="w-full p-3 border rounded" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} />
            <button className="w-full bg-emerald-900 text-white p-3 rounded font-bold">မှတ်တမ်းတင်မည်</button>
          </form>
        )}

        {/* History Table Section */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {!isPublic && (
              <button onClick={handlePrintPDF} className="no-print bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
                <Download size={16}/> PDF ထုတ်ယူမည်
              </button>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 uppercase font-bold text-emerald-900">
                  <tr>
                    <th className="p-3 text-left">ရက်စွဲ</th>
                    <th className="p-3 text-left">အမည်</th>
                    <th className="p-3 text-left">အမျိုးအစား/မှတ်ချက်</th>
                    <th className="p-3 text-right">ကျသင့်ငွေ</th>
                    {!isPublic && <th className="p-3 text-center no-print">လုပ်ဆောင်ချက်</th>}
                  </tr>
                </thead>
                <tbody>
                  {penalties.map(p => {
                    const days = getDaysOverdue(p.date);
                    const amount = calculateAmount(p);
                    const isOverdue = !p.isPaid && days > 0;

                    return (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          {p.date}
                          <div className="mt-1">
                            {p.isPaid ? (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">ပေးပြီး</span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                {isOverdue ? `လွန်နေသည် (${days} ရက်)` : 'ယနေ့ဆောင်ရန်'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-emerald-900">{p.therapistName}</td>
                        <td className="p-3">
                          <p>{p.category}</p>
                          {p.remark && <p className="text-slate-500 text-xs">{p.remark}</p>}
                        </td>
                        <td className={`p-3 text-right font-bold ${p.isPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                          {amount.toLocaleString()} Ks
                        </td>
                        {!isPublic && (
                          <td className="p-3 text-center no-print flex justify-center gap-3">
                            {!p.isPaid && (
                              <button onClick={() => handleMarkAsPaid(p)} className="text-emerald-500 hover:text-emerald-700" title="ပေးဆောင်ပြီးဖြစ်ကြောင်း မှတ်မည်">
                                <CheckCircle size={18}/>
                              </button>
                            )}
                            <button onClick={() => {if(window.confirm('ဖျက်ရန်သေချာပါသလား?')) deleteDoc(doc(db, 'penalties', p.id));}} className="text-red-500 hover:text-red-700" title="ဖျက်ရန်">
                              <Trash2 size={18}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal (ဝန်ထမ်းနာမည်နှိပ်လျှင် ပေါ်မည့်အကွက်) */}
      {selectedTherapist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 relative">
            <button onClick={() => setSelectedTherapist(null)} className="absolute top-2 right-2"><X/></button>
            <h2 className="font-bold text-emerald-900 text-lg mb-4">{selectedTherapist.name} ၏ မှတ်တမ်း</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedTherapist.list.length === 0 ? (
                <p className="text-slate-500 text-sm">မှတ်တမ်းမရှိပါ။</p>
              ) : (
                selectedTherapist.list.map((p: any) => {
                  const days = getDaysOverdue(p.date);
                  const amount = calculateAmount(p);
                  return (
                    <div key={p.id} className={`border-b pb-2 text-sm ${p.isPaid ? 'opacity-70' : ''}`}>
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-emerald-800">{p.date}</p>
                        <p className={`font-bold ${p.isPaid ? 'text-emerald-600' : 'text-red-600'}`}>{amount.toLocaleString()} Ks</p>
                      </div>
                      <p>{p.category}</p>
                      <p className="text-[10px] font-bold mt-1">
                        {p.isPaid ? (
                           <span className="text-emerald-600">✓ ပေးဆောင်ပြီး ({p.paidDate})</span>
                        ) : (
                           <span className={days > 0 ? 'text-red-600' : 'text-orange-600'}>
                             {days > 0 ? `! ရက်လွန်နေသည် (${days} ရက်)` : '• ယနေ့ဆောင်ရန်'}
                           </span>
                        )}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
