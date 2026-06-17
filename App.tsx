import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Home, FilePlus, ClipboardList, Trash2, X, Share2, Download } from 'lucide-react';

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
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  const [formData, setFormData] = useState({ therapistId: '1', category: CATEGORIES[0], amount: '', remark: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (window.location.search.includes('mode=public')) setIsPublicMode(true);
    signInAnonymously(auth);
    const q = query(collection(db, 'penalties'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPenalties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const getStats = (id: string) => {
    const p = penalties.filter(item => String(item.therapistId) === id);
    const totalAmount = p.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { count: p.length, total: totalAmount, list: p };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.amount) return alert("ပမာဏဖြည့်ပါ");
    await addDoc(collection(db, 'penalties'), { ...formData, amount: Number(formData.amount), therapistName: THERAPISTS.find(t=>t.id===formData.therapistId)?.name, createdAt: Date.now() });
    setFormData({...formData, amount: '', remark: ''});
    alert("မှတ်တမ်းတင်ပြီးပါပြီ");
    setActiveTab('dashboard');
  };

  // Error မတက်စေသော Native PDF/Print လုပ်ဆောင်ချက်
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Print ထုတ်ချိန်တွင် မလိုအပ်သည်များကို ဖျောက်ရန် CSS အထူးကုဒ် */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { display: block !important; width: 100%; }
          body { background-color: white; }
        }
      `}</style>

      {/* အပေါ်ဆုံး Navigation Bar (Print ထုတ်လျှင် ဖျောက်ထားမည်) */}
      <nav className="bg-emerald-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50 no-print">
        <h1 className="font-bold text-xl tracking-wider">THE SHANGRI-LA</h1>
        {!isPublicMode && (
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-amber-400' : ''}><Home/></button>
            <button onClick={() => setActiveTab('add')} className={activeTab === 'add' ? 'text-amber-400' : ''}><FilePlus/></button>
            <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'text-amber-400' : ''}><ClipboardList/></button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.origin + '?mode=public'); alert("Public Link ကူးယူပြီးပါပြီ။");}}><Share2/></button>
          </div>
        )}
      </nav>

      <main className="p-4 max-w-4xl mx-auto print-section">
        
        {/* ၁။ ပင်မစာမျက်နှာ (Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
            {THERAPISTS.map(t => {
              const stats = getStats(t.id);
              const isRed = stats.total > 0;
              return (
                <div key={t.id} onClick={() => setSelectedTherapist({...t, ...stats})} 
                     className={`p-5 rounded-xl shadow-sm border-l-8 cursor-pointer relative overflow-hidden transition-all hover:opacity-80 ${isRed ? 'border-red-500 bg-red-50' : 'border-emerald-600 bg-white'}`}>
                  
                  {/* ဒဏ်ကြေးရှိ အနီရောင် Box */}
                  {isRed && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-3 py-1 rounded-bl-lg font-bold shadow-sm">
                      ဒဏ်ကြေးရှိ
                    </div>
                  )}
                  
                  <h3 className="font-bold text-emerald-900 text-lg mb-1">{t.name}</h3>
                  <p className={`text-sm font-bold ${isRed ? 'text-red-700' : 'text-emerald-700'}`}>
                    စုစုပေါင်း: {stats.total.toLocaleString()} Ks ({stats.count} ကြိမ်)
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ၂။ ဒဏ်ကြေးသွင်းရန် (Add Form) */}
        {activeTab === 'add' && !isPublicMode && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-4 no-print">
            <h2 className="font-bold text-emerald-900 text-xl border-b pb-3">ဒဏ်ကြေးအသစ် မှတ်တမ်းတင်ရန်</h2>
            <select className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" onChange={e => setFormData({...formData, therapistId: e.target.value})}>{THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="date" className="w-full p-3 border border-slate-300 rounded outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required/>
            <select className="w-full p-3 border border-slate-300 rounded outline-none" onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input type="number" placeholder="ပမာဏ (ကျပ်)" className="w-full p-3 border border-slate-300 rounded outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required min="0"/>
            <textarea placeholder="အသေးစိတ် မှတ်ချက်..." className="w-full p-3 border border-slate-300 rounded outline-none" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} />
            <button className="w-full bg-emerald-900 hover:bg-emerald-800 text-white p-3 rounded font-bold transition-colors">မှတ်တမ်းတင်မည်</button>
          </form>
        )}

        {/* ၃။ မှတ်တမ်းများ (History) */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* PDF ထုတ်ရန် ခလုတ် */}
            {!isPublicMode && (
              <button onClick={handlePrintPDF} className="no-print bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm">
                <Download size={18}/> PDF အဖြစ် သိမ်းမည်
              </button>
            )}

            {/* မှတ်တမ်း ဇယား */}
            <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
              <table className="w-full text-sm text-left">
                {/* ဇယားခေါင်းစဉ် Bold အစိမ်းရောင် */}
                <thead className="bg-emerald-50 border-b border-emerald-100">
                  <tr className="font-bold text-emerald-900 uppercase">
                    <th className="p-4">ရက်စွဲ</th>
                    <th className="p-4">အမည်</th>
                    <th className="p-4">အမျိုးအစား</th>
                    <th className="p-4">မှတ်ချက်</th>
                    <th className="p-4 text-right">ကျပ်</th>
                    {!isPublicMode && <th className="p-4 no-print text-center">လုပ်ဆောင်ချက်</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {penalties.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4">{p.date}</td>
                      <td className="p-4 font-bold text-emerald-900">{p.therapistName}</td>
                      <td className="p-4 text-slate-700">{p.category}</td>
                      <td className="p-4 text-slate-600">{p.remark}</td>
                      <td className="p-4 font-bold text-red-600 text-right">{Number(p.amount).toLocaleString()}</td>
                      {!isPublicMode && (
                        <td className="p-4 text-center no-print">
                          <button onClick={() => { if(window.confirm('ဖျက်ရန် သေချာပါသလား?')) deleteDoc(doc(db, 'penalties', p.id)); }} className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">
                            <Trash2 size={18}/>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {penalties.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">မှတ်တမ်း မရှိသေးပါ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ၄။ ဝန်ထမ်းနာမည်နှိပ်လျှင် ပေါ်မည့် Detail Modal */}
      {selectedTherapist && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button onClick={() => setSelectedTherapist(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full"><X/></button>
            
            <h2 className="font-bold text-emerald-900 text-xl border-b pb-3 mb-4">
              {selectedTherapist.name} ၏ အသေးစိတ်မှတ်တမ်း
            </h2>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {selectedTherapist.list.length === 0 ? (
                <p className="text-center text-slate-500 py-4">မှတ်တမ်း မရှိပါ။</p>
              ) : (
                selectedTherapist.list.map((p: any) => (
                  <div key={p.id} className="border border-slate-100 bg-slate-50 p-3 rounded-lg flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-800 text-sm">{p.date}</span>
                      <span className="font-bold text-red-600">{Number(p.amount).toLocaleString()} Ks</span>
                    </div>
                    <p className="text-slate-700 text-sm">{p.category}</p>
                    {p.remark && <p className="text-slate-500 text-xs italic">{p.remark}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
