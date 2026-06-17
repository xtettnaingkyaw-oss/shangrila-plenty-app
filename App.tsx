import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Home, FilePlus, ClipboardList, Trash2, X } from 'lucide-react';

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
  const [formData, setFormData] = useState({ therapistId: '1', category: CATEGORIES[0], amount: '', remark: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    signInAnonymously(auth);
    const q = query(collection(db, 'penalties'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPenalties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const getStats = (id: string) => {
    const p = penalties.filter(item => item.therapistId === id);
    return { count: p.length, total: p.reduce((sum, item) => sum + Number(item.amount), 0) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.amount) return alert("ပမာဏဖြည့်ပါ");
    await addDoc(collection(db, 'penalties'), { ...formData, therapistName: THERAPISTS.find(t=>t.id===formData.therapistId)?.name, createdAt: Date.now() });
    setFormData({...formData, amount: '', remark: ''});
    alert("မှတ်တမ်းတင်ပြီးပါပြီ");
  };

  const handleDelete = async (id: string) => {
    if(confirm("ဖျက်ရန်သေချာပါသလား?")) await deleteDoc(doc(db, 'penalties', id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-emerald-900 text-white p-4 flex justify-between shadow-lg sticky top-0 z-50">
        <h1 className="font-bold text-xl">THE SHANGRI-LA</h1>
        <div className="flex gap-4"><button onClick={() => setActiveTab('dashboard')}><Home/></button><button onClick={() => setActiveTab('add')}><FilePlus/></button><button onClick={() => setActiveTab('history')}><ClipboardList/></button></div>
      </nav>

      <main className="p-4 max-w-4xl mx-auto">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THERAPISTS.map(t => {
              const stats = getStats(t.id);
              const isRed = stats.total > 0;
              return (
                <div key={t.id} className={`p-4 rounded-xl shadow border-l-8 ${isRed ? 'border-red-500 bg-red-50' : 'border-emerald-600 bg-white'}`}>
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-sm font-semibold text-slate-700">စုစုပေါင်း: {stats.total.toLocaleString()} Ks ({stats.count} ကြိမ်)</p>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'add' && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="font-bold text-lg">ဒဏ်ကြေးအသစ် မှတ်တမ်းတင်ရန်</h2>
            <select className="w-full p-3 border rounded" onChange={e => setFormData({...formData, therapistId: e.target.value})}>{THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input type="date" className="w-full p-3 border rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            <select className="w-full p-3 border rounded" onChange={e => setFormData({...formData, category: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input type="number" placeholder="ပမာဏ (ကျပ်)" className="w-full p-3 border rounded" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            <textarea placeholder="မှတ်ချက်" className="w-full p-3 border rounded" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} />
            <button className="w-full bg-emerald-900 text-white p-3 rounded font-bold">မှတ်တမ်းတင်မည်</button>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 uppercase"><tr><th className="p-3 text-left">ရက်စွဲ</th><th className="p-3 text-left">အမည်</th><th className="p-3 text-left">အမျိုးအစား</th><th className="p-3 text-left">မှတ်ချက်</th><th className="p-3 text-left">ကျပ်</th><th className="p-3"></th></tr></thead>
              <tbody>
                {penalties.map(p => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3">{p.date}</td><td className="p-3">{p.therapistName}</td><td className="p-3">{p.category}</td><td className="p-3">{p.remark}</td><td className="p-3 font-bold text-red-600">{Number(p.amount).toLocaleString()}</td>
                    <td className="p-3 text-center"><button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
