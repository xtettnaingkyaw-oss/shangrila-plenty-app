import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Home, FilePlus, ClipboardList, Trash2, AlertCircle, 
  PlusCircle, User, Calendar, DollarSign, Info, Share2 
} from 'lucide-react';

// Firebase Config ယာယီ
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app: any, auth: any, db: any;
let isFirebaseEnabled = false;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseEnabled = true;
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

const THERAPISTS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `Therapist No-${i + 1}`
}));

const CATEGORIES = [
  "သန့်ရှင်းရေးတာဝန် ပျက်ကွက်ခြင်း (အခန်း၊ ဘေစင်၊ အိမ်သာ စသည်)",
  "ခွင့်ပြုချက်မရှိဘဲ အပြင်ထွက်ခြင်း / Jibble မမှတ်ခြင်း",
  "ဆူညံခြင်း / သတ်မှတ်ချိန်ပြင်ပ ဂိမ်းကစားခြင်း",
  "ဧည့်သည်အား ဝန်ဆောင်မှုအားနည်းခြင်း / အဆင်မပြေဖြစ်ခြင်း",
  "စည်းကမ်းမဲ့ ဆေးလိပ်၊ အရက်၊ မူးယစ်ဆေးသုံးခြင်း",
  "မီးဖိုချောင်စည်းကမ်း ဖောက်ဖျက်ခြင်း (စားကြွင်းစားကျန်/ပန်းကန်မဆေး)",
  "အိပ်ချိန်စည်းကမ်း (ည ၁၂ နာရီ) ဖောက်ဖျက်ခြင်း",
  "အခြား ဖောက်ဖျက်မှုများ"
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [penalties, setPenalties] = useState<any[]>([]);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    therapistId: '1',
    category: CATEGORIES[0],
    amount: '',
    remark: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'public') {
      setIsPublicMode(true);
      setActiveTab('dashboard'); 
    }
  }, []);

  useEffect(() => {
    if (isFirebaseEnabled && auth && db) {
      signInAnonymously(auth).catch(console.error);
      const unsubscribeAuth = onAuthStateChanged(auth, setUser);
      
      const penaltiesRef = collection(db, 'penalties');
      const unsubscribeData = onSnapshot(penaltiesRef, (snapshot) => {
        const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPenalties(fetchedData);
      });

      return () => {
        unsubscribeAuth();
        unsubscribeData();
      };
    } else {
      const saved = localStorage.getItem('shangrila_penalties');
      if (saved) setPenalties(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseEnabled) {
      localStorage.setItem('shangrila_penalties', JSON.stringify(penalties));
    }
  }, [penalties]);

  const showNotification = (message: string, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const copyPublicLink = () => {
    const currentUrl = window.location.href.split('?')[0]; 
    const publicUrl = `${currentUrl}?mode=public`;

    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1') || currentUrl.startsWith('blob:')) {
       showNotification("Hosting တင်ပြီးမှသာ အခြားဖုန်းများသို့ Link ပေး၍ရပါမည်။", "error");
       return;
    }

    const el = document.createElement('textarea');
    el.value = publicUrl;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showNotification("ဝန်ထမ်းများ ကြည့်ရှုရန် Link ကို ကူးယူပြီးပါပြီ။", "success");
  };

  const handleSubmitPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseInt(formData.amount) <= 0) {
      showNotification("ဒဏ်ကြေးပမာဏ ထည့်သွင်းပါ။", "error");
      return;
    }

    const newPenalty: any = {
      ...formData,
      amount: parseFloat(formData.amount),
      therapistName: THERAPISTS.find(t => t.id === parseInt(formData.therapistId))?.name,
      createdAt: new Date().getTime()
    };

    try {
      if (isFirebaseEnabled && db) {
        await addDoc(collection(db, 'penalties'), newPenalty);
      } else {
        newPenalty.id = Date.now().toString();
        setPenalties(prev => [newPenalty, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
      showNotification("ဒဏ်ကြေး မှတ်တမ်းတင်ပြီးပါပြီ။");
      setFormData(prev => ({ ...prev, amount: '', remark: '' }));
    } catch (error) {
      showNotification("မှတ်တမ်းတင်ရာတွင် အမှားအယွင်းရှိပါသည်။", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?")) {
      try {
        if (isFirebaseEnabled && db) {
          await deleteDoc(doc(db, 'penalties', id));
        } else {
          setPenalties(prev => prev.filter(p => p.id !== id));
        }
        showNotification("မှတ်တမ်း ဖျက်ပစ်လိုက်ပါပြီ။");
      } catch (error) {
        showNotification("ဖျက်ရာတွင် အမှားအယွင်းရှိပါသည်။", "error");
      }
    }
  };

  const getTherapistStats = () => {
    return THERAPISTS.map(therapist => {
      const therapistPenalties = penalties.filter(p => p.therapistId === therapist.id.toString());
      const totalAmount = therapistPenalties.reduce((sum, p) => sum + p.amount, 0);
      const violationCount = therapistPenalties.length;
      return { ...therapist, totalAmount, violationCount };
    }).sort((a, b) => b.totalAmount - a.totalAmount); 
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row relative">
      
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 ${notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
          <Info size={20} />
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      <div className="md:hidden bg-emerald-900 text-amber-500 p-4 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-lg tracking-wider">THE SHANGRI-LA</h1>
        {isPublicMode && <span className="text-xs bg-amber-500 text-emerald-900 px-2 py-1 rounded font-bold">Public View</span>}
      </div>

      {!isPublicMode && (
        <nav className="bg-emerald-900 w-full md:w-64 md:min-h-screen flex-shrink-0 shadow-xl flex flex-row md:flex-col justify-around md:justify-start overflow-x-auto md:overflow-visible z-10 sticky top-0 md:static">
          <div className="hidden md:flex flex-col items-center py-8 border-b border-emerald-800">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
              <span className="text-emerald-900 font-bold text-2xl">SL</span>
            </div>
            <h1 className="text-amber-500 font-bold text-lg tracking-widest text-center px-2">THE SHANGRI-LA</h1>
            <p className="text-emerald-200 text-xs tracking-widest mt-1">MEN'S RETREAT</p>
          </div>

          <div className="flex flex-row md:flex-col w-full px-2 md:px-4 py-2 md:py-6 gap-1 md:gap-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 p-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-amber-500 text-emerald-900 font-semibold' : 'text-emerald-100 hover:bg-emerald-800'}`}
            >
              <Home size={20} /> <span className="hidden md:inline">ပင်မစာမျက်နှာ</span>
            </button>
            <button 
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-2 p-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'add' ? 'bg-amber-500 text-emerald-900 font-semibold' : 'text-emerald-100 hover:bg-emerald-800'}`}
            >
              <FilePlus size={20} /> <span className="hidden md:inline">ဒဏ်ကြေးမှတ်ရန်</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 p-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-amber-500 text-emerald-900 font-semibold' : 'text-emerald-100 hover:bg-emerald-800'}`}
            >
              <ClipboardList size={20} /> <span className="hidden md:inline">မှတ်တမ်းများ</span>
            </button>
          </div>
        </nav>
      )}

      <main className={`flex-1 p-4 md:p-8 overflow-y-auto w-full ${isPublicMode ? 'max-w-7xl mx-auto' : ''}`}>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-4">
              <div>
                <h2 className="text-2xl font-bold text-emerald-900">ဝန်ထမ်းများ၏ ဒဏ်ကြေးအခြေအနေ</h2>
                {isPublicMode && <p className="text-slate-500 text-sm mt-1">ယခုစာမျက်နှာသည် ဝန်ထမ်းများ ကြည့်ရှုရန်အတွက်သာ ဖြစ်ပါသည်။</p>}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {!isPublicMode && (
                  <button
                    onClick={copyPublicLink}
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Share2 size={18} /> Public Link
                  </button>
                )}
                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <User size={18} /> စုစုပေါင်း: {THERAPISTS.length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getTherapistStats().map((t) => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                  {t.totalAmount > 0 && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold shadow-sm">
                      ဒဏ်ကြေးရှိ
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${t.totalAmount > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {t.id}
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">{t.name}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">အကြိမ်အရေအတွက်:</span>
                      <span className="font-medium text-slate-700">{t.violationCount} ကြိမ်</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                      <span className="text-slate-500">စုစုပေါင်း (ကျပ်):</span>
                      <span className={`font-bold ${t.totalAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {t.totalAmount.toLocaleString()} Ks
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-emerald-900 pb-4 border-b">ဒဏ်ကြေးအသစ် မှတ်တမ်းတင်ရန်</h2>
            <form onSubmit={handleSubmitPenalty} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-amber-500" /> ဝန်ထမ်း
                </label>
                <select name="therapistId" value={formData.therapistId} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none">
                  {THERAPISTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar size={16} className="text-amber-500" /> ရက်စွဲ
                </label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" /> ဖောက်ဖျက်မှု အမျိုးအစား
                </label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none">
                  {CATEGORIES.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <DollarSign size={16} className="text-amber-500" /> ပမာဏ (ကျပ်)
                </label>
                <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="5000" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none" required min="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Info size={16} className="text-amber-500" /> မှတ်ချက်
                </label>
                <textarea name="remark" value={formData.remark} onChange={handleInputChange} placeholder="အသေးစိတ်ရေးရန်..." rows={3} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none resize-none"></textarea>
              </div>
              <button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <PlusCircle size={20} /> မှတ်တမ်းတင်မည်
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-900 pb-4 border-b">ဒဏ်ကြေးမှတ်တမ်းများ</h2>
            {penalties.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500 flex flex-col items-center">
                <ClipboardList size={48} className="text-slate-300 mb-3" />
                <p>မှတ်တမ်းတင်ထားသော ဒဏ်ကြေးများ မရှိသေးပါ။</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-sm uppercase">
                        <th className="p-4">ရက်စွဲ</th>
                        <th className="p-4">ဝန်ထမ်းအမည်</th>
                        <th className="p-4">အမျိုးအစား / မှတ်ချက်</th>
                        <th className="p-4 text-right">ပမာဏ (ကျပ်)</th>
                        <th className="p-4 text-center">လုပ်ဆောင်ချက်</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {penalties.map((penalty) => (
                        <tr key={penalty.id} className="hover:bg-slate-50">
                          <td className="p-4 whitespace-nowrap text-sm text-slate-600">{penalty.date}</td>
                          <td className="p-4 whitespace-nowrap font-medium text-slate-800">
                            <span className="bg-emerald-100 text-emerald-800 py-1 px-2 rounded text-xs mr-2">No-{penalty.therapistId}</span>
                            {penalty.therapistName}
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-medium text-slate-800">{penalty.category}</p>
                            {penalty.remark && <p className="text-xs text-slate-500 mt-1">{penalty.remark}</p>}
                          </td>
                          <td className="p-4 whitespace-nowrap text-right font-bold text-red-600">
                            {penalty.amount.toLocaleString()}
                          </td>
                          <td className="p-4 whitespace-nowrap text-center">
                            <button onClick={() => handleDelete(penalty.id)} className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50" title="ဖျက်ရန်">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
