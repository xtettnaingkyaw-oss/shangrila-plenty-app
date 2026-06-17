import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Home, FilePlus, ClipboardList, Trash2, X, Share2 } from 'lucide-react';

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

  const getStats = (id: string) => {
    const p = penalties.filter(item => item.therapistId === id);
    return { count: p.length, total: p.reduce((sum, item) => sum + Number(item.amount), 0), list: p };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!isPublic && (
        <nav className="bg-emerald-900 text-white p-4 flex justify-between shadow-lg sticky top-0 z-50">
          <h1 className="font-bold text-xl">THE SHANGRI-LA</h1>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('dashboard')}><Home/></button>
            <button onClick={() => setActiveTab('add')}><FilePlus/></button>
            <button onClick={() => setActiveTab('history')}><ClipboardList/></button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.origin + '?mode=public'); alert("Link ကူးယူပြီးပါပြီ")}}><Share2/></button>
          </div>
        </nav>
      )}

      <main className="p-4 max-w-4xl mx-auto">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THERAPISTS.map(t => {
              const stats = getStats(t.id);
              return (
                <div key={t.id} onClick={() => setSelectedTherapist({...t, ...stats})} 
                     className={`p-4 rounded-xl shadow border-l-8 cursor-pointer hover:bg-emerald-50 ${stats.total > 0 ? 'border-red-500 bg-red-50' : 'border-emerald-600 bg-white'}`}>
                  <h3 className="font-bold text-emerald-900 text-lg">{t.name}</h3>
                  <p className="text-sm font-bold text-emerald-800">စုစုပေါင်း: {stats.total.toLocaleString()} Ks ({stats.count} ကြိမ်)</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ... (add form and history table remain similar, but ensure headers have 'font-bold text-emerald-900' class) */}
      </main>

      {selectedTherapist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 relative">
            <button onClick={() => setSelectedTherapist(null)} className="absolute top-2 right-2"><X/></button>
            <h2 className="font-bold text-emerald-900 text-lg mb-4">{selectedTherapist.name} ၏ မှတ်တမ်း</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedTherapist.list.map((p: any) => (
                <div key={p.id} className="border-b pb-2 text-sm">
                  <p className="font-bold text-emerald-800">{p.date}</p>
                  <p>{p.category}</p>
                  <p className="font-bold text-red-600">{Number(p.amount).toLocaleString()} Ks</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
