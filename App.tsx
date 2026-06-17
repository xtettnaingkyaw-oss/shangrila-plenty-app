import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Home, FilePlus, ClipboardList, Trash2, AlertCircle, 
  PlusCircle, User, Calendar, DollarSign, Info, Share2 
} from 'lucide-react';

// 🔴 အရေးကြီး - ဤနေရာတွင် သင်၏ကိုယ်ပိုင် Firebase Config ကို ထည့်သွင်းရပါမည်
// (လက်ရှိတွင် စမ်းသပ်ရန် ယာယီ Local Storage စနစ်ဖြင့် အလုပ်လုပ်နေပါမည်)
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

// ဝန်ထမ်း ၁၅ ယောက်
const THERAPISTS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `Therapist No-${i + 1}`
}));

// PDF ပါ စည်းကမ်းချက်များကို အခြေခံထားသော အမျိုးအစားများ
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

  // URL ကိုစစ်ဆေးပြီး Public View Mode ဟုတ်မဟုတ် ဆုံးဖြတ်ခြင်း
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'public') {
      setIsPublicMode(true);
      setActiveTab('dashboard'); 
    }
  }, []);

  // Firebase Auth & Data Fetching (သို့မဟုတ်) Local Storage
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
      // Firebase မချိတ်ရသေးပါက Browser ၏ Local Storage ကို ယာယီသုံးပါမည်
      const saved = localStorage.getItem('shangrila_penalties');
      if (saved) setPenalties(JSON.parse(saved));
    }
  }, []);

  // Local Storage သို့ ယာယီသိမ်းဆည်းခြင်း
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