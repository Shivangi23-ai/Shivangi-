
import React, { useEffect, useState, useRef } from 'react';
import { User, ViewState, SystemSettings, Subject, Chapter, MCQItem, RecoveryRequest, ActivityLogEntry, LeaderboardEntry, RecycleBinItem, Stream, Board, ClassLevel, GiftCode } from '../types';
import { Users, Search, Trash2, Save, X, Eye, Shield, Megaphone, CheckCircle, ListChecks, Database, FileText, Monitor, Sparkles, Banknote, BrainCircuit, AlertOctagon, ArrowLeft, Key, Bell, ShieldCheck, Lock, Globe, Layers, Zap, PenTool, RefreshCw, RotateCcw, Plus, LogOut, Download, Upload, CreditCard, Ticket, Video, Image as ImageIcon, Type, Link, FileJson, Activity, AlertTriangle, Gift, Book, Mail, Edit3, MessageSquare, ShoppingBag } from 'lucide-react';
import { getSubjectsList, DEFAULT_SUBJECTS } from '../constants';
import { fetchChapters } from '../services/gemini';

interface Props {
  onNavigate: (view: ViewState) => void;
  settings?: SystemSettings;
  onUpdateSettings?: (s: SystemSettings) => void;
  onImpersonate?: (user: User) => void;
  logActivity: (action: string, details: string) => void;
}

// --- TAB DEFINITIONS ---
type AdminTab = 
  | 'DASHBOARD' 
  | 'USERS' 
  | 'CODES'          // NEW: Gift Code Generator
  | 'SUBJECTS_MGR'   // NEW: Subject Manager
  | 'LEADERBOARD' 
  | 'NOTICES' 
  | 'DATABASE' 
  | 'ACCESS' 
  | 'LOGS' 
  | 'DEMAND' 
  | 'RECYCLE' 
  | 'SYLLABUS_MANAGER' 
  | 'CONTENT_PDF' 
  | 'CONTENT_MCQ' 
  | 'CONTENT_TEST' 
  | 'CONFIG_GENERAL' 
  | 'CONFIG_SECURITY' 
  | 'CONFIG_VISIBILITY' 
  | 'CONFIG_AI' 
  | 'CONFIG_ADS' 
  | 'CONFIG_PAYMENT';

interface ContentConfig {
    freeLink?: string;
    premiumLink?: string;
    price?: number;
    manualMcqData?: MCQItem[];
    weeklyTestMcqData?: MCQItem[];
}

export const AdminDashboard: React.FC<Props> = ({ onNavigate, settings, onUpdateSettings, onImpersonate, logActivity }) => {
  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- DATA LISTS ---
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [demands, setDemands] = useState<{id:string, details:string, timestamp:string}[]>([]);
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);

  // --- DATABASE EDITOR ---
  const [dbKey, setDbKey] = useState('nst_users');
  const [dbContent, setDbContent] = useState('');

  // --- SETTINGS STATE ---
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings || {
      appName: 'NST',
      themeColor: '#3b82f6',
      maintenanceMode: false,
      maintenanceMessage: 'We are upgrading our servers.',
      customCSS: '',
      apiKeys: [],
      adminCode: '', adminEmail: '', adminPhone: '', footerText: 'Developed by Nadim Anwar',
      welcomeTitle: 'AI Smart Study', welcomeMessage: 'Welcome to NST',
      termsText: 'Terms...', supportEmail: 'support@nst.com', aiModel: 'gemini-2.5-flash',
      aiInstruction: '',
      marqueeLines: ["Welcome to NST App"],
      liveMessage1: '', liveMessage2: '',
      wheelRewards: [0,1,2,5],
      chatCost: 1, dailyReward: 3, signupBonus: 2,
      isChatEnabled: true, isGameEnabled: true, allowSignup: true, loginMessage: '',
      allowedClasses: ['6', '7', '8', '9', '10', '11', '12'],
      allowedBoards: ['CBSE', 'BSEB'], allowedStreams: ['Science', 'Commerce', 'Arts'],
      hiddenSubjects: [], storageCapacity: '100 GB',
      isPaymentEnabled: true, upiId: '', upiName: '', qrCodeUrl: '', paymentInstructions: '',
      packages: [],
      startupAd: { enabled: true, duration: 3, title: "Premium App", features: ["Notes", "MCQ"], bgColor: "#1e293b", textColor: "#ffffff" }
  });

  // --- PACKAGE MANAGER STATE ---
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('');
  const [newPkgCredits, setNewPkgCredits] = useState('');

  // --- CONTENT SELECTION STATE ---
  const [selBoard, setSelBoard] = useState<Board>('CBSE');
  const [selClass, setSelClass] = useState<ClassLevel>('10');
  const [selStream, setSelStream] = useState<Stream>('Science');
  const [selSubject, setSelSubject] = useState<Subject | null>(null);
  const [selChapters, setSelChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  
  // --- EDITING STATE ---
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<ContentConfig>({ freeLink: '', premiumLink: '', price: 0 });
  const [editingMcqs, setEditingMcqs] = useState<MCQItem[]>([]);
  const [editingTestMcqs, setEditingTestMcqs] = useState<MCQItem[]>([]);
  
  // --- USER EDIT MODAL STATE ---
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserCredits, setEditUserCredits] = useState(0);
  const [editUserPass, setEditUserPass] = useState('');
  const [dmText, setDmText] = useState('');
  const [dmUser, setDmUser] = useState<User | null>(null);

  // --- GIFT CODE STATE ---
  const [newCodeAmount, setNewCodeAmount] = useState(10);
  const [newCodeCount, setNewCodeCount] = useState(1);

  // --- SUBJECT MANAGER STATE ---
  const [customSubjects, setCustomSubjects] = useState<any>({});
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('book');
  const [newSubColor, setNewSubColor] = useState('bg-slate-50 text-slate-600');

  // --- INITIAL LOAD & AUTO REFRESH ---
  useEffect(() => {
      loadData();
      const interval = setInterval(loadData, 5000); 
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (activeTab === 'DATABASE') {
          setDbContent(localStorage.getItem(dbKey) || '');
      }
  }, [activeTab, dbKey]);

  // Clear selections when switching main tabs
  useEffect(() => {
      if (!['SYLLABUS_MANAGER', 'CONTENT_PDF', 'CONTENT_MCQ', 'CONTENT_TEST'].includes(activeTab)) {
          setSelSubject(null);
          setEditingChapterId(null);
      }
  }, [activeTab]);

  const loadData = () => {
      const storedUsersStr = localStorage.getItem('nst_users');
      if (storedUsersStr) setUsers(JSON.parse(storedUsersStr));
      
      const demandStr = localStorage.getItem('nst_demand_requests');
      if (demandStr) setDemands(JSON.parse(demandStr));

      const reqStr = localStorage.getItem('nst_recovery_requests');
      if (reqStr) setRecoveryRequests(JSON.parse(reqStr));

      const logsStr = localStorage.getItem('nst_activity_log');
      if (logsStr) setLogs(JSON.parse(logsStr));

      const codesStr = localStorage.getItem('nst_admin_codes');
      if (codesStr) setGiftCodes(JSON.parse(codesStr));

      const subStr = localStorage.getItem('nst_custom_subjects_pool');
      if (subStr) setCustomSubjects(JSON.parse(subStr));

      const binStr = localStorage.getItem('nst_recycle_bin');
      if (binStr) {
          const binItems: RecycleBinItem[] = JSON.parse(binStr);
          const now = new Date();
          const validItems = binItems.filter(item => new Date(item.expiresAt) > now);
          if (validItems.length !== binItems.length) {
              localStorage.setItem('nst_recycle_bin', JSON.stringify(validItems));
          }
          setRecycleBin(validItems);
      }
  };

  // --- SETTINGS HANDLERS ---
  const handleSaveSettings = () => {
      if (onUpdateSettings) {
          onUpdateSettings(localSettings);
          localStorage.setItem('nst_system_settings', JSON.stringify(localSettings));
          logActivity("SETTINGS_UPDATE", "Updated system settings");
          alert("Settings Saved!");
      }
  };

  const toggleSetting = (key: keyof SystemSettings) => {
      const newVal = !localSettings[key];
      const updated = { ...localSettings, [key]: newVal };
      setLocalSettings(updated);
      if(onUpdateSettings) onUpdateSettings(updated);
  };

  const toggleItemInList = <T extends string>(list: T[] | undefined, item: T): T[] => {
      const current = list || [];
      return current.includes(item) ? current.filter(i => i !== item) : [...current, item];
  };

  // --- RECYCLE BIN HANDLERS ---
  const softDelete = (type: RecycleBinItem['type'], name: string, data: any, originalKey?: string, originalId?: string) => {
      if (!window.confirm(`DELETE "${name}"?\n(Moved to Recycle Bin for 90 days)`)) return false;

      const newItem: RecycleBinItem = {
          id: Date.now().toString(),
          originalId: originalId || Date.now().toString(),
          type,
          name,
          data,
          deletedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          restoreKey: originalKey
      };

      const newBin = [...recycleBin, newItem];
      setRecycleBin(newBin);
      localStorage.setItem('nst_recycle_bin', JSON.stringify(newBin));
      return true;
  };

  const handleRestoreItem = (item: RecycleBinItem) => {
      if (!window.confirm(`Restore "${item.name}"?`)) return;

      if (item.type === 'USER') {
          const stored = localStorage.getItem('nst_users');
          const users: User[] = stored ? JSON.parse(stored) : [];
          if (!users.some(u => u.id === item.data.id)) {
              users.push(item.data);
              localStorage.setItem('nst_users', JSON.stringify(users));
          } else {
              alert("User ID already exists. Cannot restore.");
              return;
          }
      } else if (item.restoreKey) {
          if (item.type === 'CHAPTER') {
              const listStr = localStorage.getItem(item.restoreKey);
              const list = listStr ? JSON.parse(listStr) : [];
              list.push(item.data);
              localStorage.setItem(item.restoreKey, JSON.stringify(list));
          } else {
              localStorage.setItem(item.restoreKey, JSON.stringify(item.data));
          }
      }

      const newBin = recycleBin.filter(i => i.id !== item.id);
      setRecycleBin(newBin);
      localStorage.setItem('nst_recycle_bin', JSON.stringify(newBin));
      alert("Item Restored!");
      loadData(); 
  };

  const handlePermanentDelete = (id: string) => {
      if (window.confirm("PERMANENTLY DELETE? This cannot be undone.")) {
          const newBin = recycleBin.filter(i => i.id !== id);
          setRecycleBin(newBin);
          localStorage.setItem('nst_recycle_bin', JSON.stringify(newBin));
      }
  };

  // --- USER MANAGEMENT (Enhanced) ---
  const deleteUser = (userId: string) => {
      const userToDelete = users.find(u => u.id === userId);
      if (!userToDelete) return;
      if (softDelete('USER', userToDelete.name, userToDelete, undefined, userToDelete.id)) {
          const updated = users.filter(u => u.id !== userId);
          setUsers(updated);
          localStorage.setItem('nst_users', JSON.stringify(updated));
          logActivity("USER_DELETE", `Moved user ${userId} to Recycle Bin`);
      }
  };

  const openEditUser = (user: User) => {
      setEditingUser(user);
      setEditUserCredits(user.credits);
      setEditUserPass(user.password);
  };

  const saveEditedUser = () => {
      if (!editingUser) return;
      const updatedUser = { ...editingUser, credits: editUserCredits, password: editUserPass };
      const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
      setUsers(updatedList);
      localStorage.setItem('nst_users', JSON.stringify(updatedList));
      setEditingUser(null);
      alert("User Updated Successfully");
  };

  const sendDirectMessage = () => {
      if (!dmUser || !dmText) return;
      const newMsg = { id: Date.now().toString(), text: dmText, date: new Date().toISOString(), read: false };
      const updatedUser = { ...dmUser, inbox: [newMsg, ...(dmUser.inbox || [])] };
      const updatedList = users.map(u => u.id === dmUser.id ? updatedUser : u);
      setUsers(updatedList);
      localStorage.setItem('nst_users', JSON.stringify(updatedList));
      setDmUser(null);
      setDmText('');
      alert("Message Sent!");
  };

  // --- GIFT CODE MANAGER (New) ---
  const generateCodes = () => {
      const newCodes: GiftCode[] = [];
      for (let i = 0; i < newCodeCount; i++) {
          const code = `NST-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${newCodeAmount}`;
          newCodes.push({
              id: Date.now().toString() + i,
              code,
              amount: newCodeAmount,
              createdAt: new Date().toISOString(),
              isRedeemed: false,
              generatedBy: 'ADMIN'
          });
      }
      const updated = [...newCodes, ...giftCodes];
      setGiftCodes(updated);
      localStorage.setItem('nst_admin_codes', JSON.stringify(updated));
      alert(`${newCodeCount} Codes Generated!`);
  };

  const deleteCode = (id: string) => {
      const updated = giftCodes.filter(c => c.id !== id);
      setGiftCodes(updated);
      localStorage.setItem('nst_admin_codes', JSON.stringify(updated));
  };

  // --- SUBJECT MANAGER (New) ---
  const addSubject = () => {
      if (!newSubName) return;
      const id = newSubName.toLowerCase().replace(/\s+/g, '');
      const newSubject = { id, name: newSubName, icon: newSubIcon, color: newSubColor };
      const updatedPool = { ...DEFAULT_SUBJECTS, ...customSubjects, [id]: newSubject };
      setCustomSubjects(updatedPool); // This only stores custom ones technically in state, but logic handles merge
      localStorage.setItem('nst_custom_subjects_pool', JSON.stringify(updatedPool));
      setNewSubName('');
      alert("Subject Added!");
  };

  // --- PACKAGE MANAGER (New) ---
  const addPackage = () => {
      if (!newPkgName || !newPkgPrice || !newPkgCredits) return;
      const newPkg = {
          id: `pkg-${Date.now()}`,
          name: newPkgName,
          price: Number(newPkgPrice),
          credits: Number(newPkgCredits)
      };
      const currentPkgs = localSettings.packages || [];
      const updatedPkgs = [...currentPkgs, newPkg];
      setLocalSettings({ ...localSettings, packages: updatedPkgs });
      setNewPkgName(''); setNewPkgPrice(''); setNewPkgCredits('');
  };

  const removePackage = (id: string) => {
      const currentPkgs = localSettings.packages || [];
      setLocalSettings({ ...localSettings, packages: currentPkgs.filter(p => p.id !== id) });
  };

  // --- CONTENT & SYLLABUS LOGIC ---
  const handleSubjectClick = async (s: Subject) => {
      setSelSubject(s);
      setIsLoadingChapters(true);
      try {
          const ch = await fetchChapters(selBoard, selClass, selStream, s, 'English');
          setSelChapters(ch);
      } catch (e) { console.error(e); setSelChapters([]); }
      setIsLoadingChapters(false);
  };

  const loadChapterContent = (chId: string) => {
      const streamKey = (selClass === '11' || selClass === '12') ? `-${selStream}` : '';
      const key = `nst_content_${selBoard}_${selClass}${streamKey}_${selSubject?.name}_${chId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
          const data = JSON.parse(stored);
          setEditConfig(data);
          setEditingMcqs(data.manualMcqData || []);
          setEditingTestMcqs(data.weeklyTestMcqData || []);
      } else {
          setEditConfig({ freeLink: '', premiumLink: '', price: 5 });
          setEditingMcqs([]);
          setEditingTestMcqs([]);
      }
      setEditingChapterId(chId);
  };

  const saveChapterContent = () => {
      if (!editingChapterId || !selSubject) return;
      const streamKey = (selClass === '11' || selClass === '12') ? `-${selStream}` : '';
      const key = `nst_content_${selBoard}_${selClass}${streamKey}_${selSubject.name}_${editingChapterId}`;
      const existing = localStorage.getItem(key);
      const existingData = existing ? JSON.parse(existing) : {};
      
      const newData = {
          ...existingData,
          freeLink: editConfig.freeLink,
          premiumLink: editConfig.premiumLink,
          price: editConfig.price,
          manualMcqData: editingMcqs,
          weeklyTestMcqData: editingTestMcqs
      };
      
      localStorage.setItem(key, JSON.stringify(newData));
      alert("✅ Content Saved Successfully!");
  };

  const saveSyllabusList = () => {
      if (!selSubject) return;
      const streamKey = (selClass === '11' || selClass === '12') ? `-${selStream}` : '';
      const cacheKey = `nst_custom_chapters_${selBoard}-${selClass}${streamKey}-${selSubject.name}-English`;
      localStorage.setItem(cacheKey, JSON.stringify(selChapters));
      // Save Hindi fallback
      const cacheKeyHindi = `nst_custom_chapters_${selBoard}-${selClass}${streamKey}-${selSubject.name}-Hindi`;
      localStorage.setItem(cacheKeyHindi, JSON.stringify(selChapters));
      alert("Syllabus Structure Saved!");
  };

  const deleteChapter = (idx: number) => {
      const ch = selChapters[idx];
      const streamKey = (selClass === '11' || selClass === '12') ? `-${selStream}` : '';
      const cacheKey = `nst_custom_chapters_${selBoard}-${selClass}${streamKey}-${selSubject?.name}-English`;
      
      if (softDelete('CHAPTER', ch.title, ch, cacheKey)) {
          const updated = selChapters.filter((_, i) => i !== idx);
          setSelChapters(updated);
      }
  };

  // --- MCQ EDITING HELPERS ---
  const updateMcq = (isTest: boolean, idx: number, field: keyof MCQItem, val: any) => {
      const list = isTest ? editingTestMcqs : editingMcqs;
      const updated = [...list];
      updated[idx] = { ...updated[idx], [field]: val };
      isTest ? setEditingTestMcqs(updated) : setEditingMcqs(updated);
  };
  const updateMcqOption = (isTest: boolean, qIdx: number, oIdx: number, val: string) => {
      const list = isTest ? editingTestMcqs : editingMcqs;
      const updated = [...list];
      updated[qIdx].options[oIdx] = val;
      isTest ? setEditingTestMcqs(updated) : setEditingMcqs(updated);
  };
  const addMcq = (isTest: boolean) => {
      const newItem: MCQItem = { question: 'New Question', options: ['A','B','C','D'], correctAnswer: 0, explanation: '' };
      isTest ? setEditingTestMcqs([...editingTestMcqs, newItem]) : setEditingMcqs([...editingMcqs, newItem]);
  };
  const removeMcq = (isTest: boolean, idx: number) => {
      const list = isTest ? editingTestMcqs : editingMcqs;
      const updated = list.filter((_, i) => i !== idx);
      isTest ? setEditingTestMcqs(updated) : setEditingMcqs(updated);
  };

  // --- ACCESS REQUEST HANDLERS ---
  const handleApproveRequest = (req: RecoveryRequest) => {
      const updatedReqs = recoveryRequests.map(r => r.id === req.id ? { ...r, status: 'RESOLVED' } : r);
      setRecoveryRequests(updatedReqs as RecoveryRequest[]);
      localStorage.setItem('nst_recovery_requests', JSON.stringify(updatedReqs));
  };

  // --- SUB-COMPONENTS (RENDER HELPERS) ---
  const DashboardCard = ({ icon: Icon, label, onClick, color, count }: any) => (
      <button onClick={onClick} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 bg-white border-slate-200 hover:border-${color}-400 hover:bg-${color}-50`}>
          <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
              <Icon size={24} />
          </div>
          <span className="font-bold text-xs uppercase text-slate-600">{label}</span>
          {count !== undefined && <span className={`text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500`}>{count}</span>}
      </button>
  );

  const SubjectSelector = () => (
      <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <select value={selBoard} onChange={e => setSelBoard(e.target.value as Board)} className="p-2 rounded border text-sm font-bold text-slate-700">
                  <option value="CBSE">CBSE</option>
                  <option value="BSEB">BSEB</option>
              </select>
              <select value={selClass} onChange={e => setSelClass(e.target.value as ClassLevel)} className="p-2 rounded border text-sm font-bold text-slate-700">
                  {['6','7','8','9','10','11','12'].map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <select value={selStream} onChange={e => setSelStream(e.target.value as Stream)} className="p-2 rounded border text-sm font-bold text-slate-700">
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
              </select>
              <button onClick={() => { setSelSubject(null); setSelChapters([]); }} className="p-2 bg-blue-600 text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1">
                  <RefreshCw size={14} /> Reset
              </button>
          </div>
          {!selSubject && (
              <div className="flex flex-wrap gap-2">
                  {getSubjectsList(selClass, selStream).map(s => (
                      <button key={s.id} onClick={() => handleSubjectClick(s)} className="px-4 py-2 rounded-lg text-sm font-bold border hover:bg-blue-50 transition-colors bg-white border-slate-200 text-slate-700">
                          {s.name}
                      </button>
                  ))}
              </div>
          )}
          {isLoadingChapters && <div className="text-slate-500 text-sm font-bold py-4 animate-pulse">Loading Chapters...</div>}
      </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="pb-20 bg-slate-50 min-h-screen">
      
      {/* 1. DASHBOARD HOME */}
      {activeTab === 'DASHBOARD' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6 animate-in fade-in">
              <div className="flex items-center gap-2 mb-6">
                  <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg"><Shield size={20} /></div>
                  <div><h2 className="font-black text-slate-800 text-lg leading-none">Admin Console</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Control System</p></div>
                  <button onClick={handleSaveSettings} className="ml-auto bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-green-700 flex items-center gap-2"><Save size={16} /> Save Settings</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <DashboardCard icon={Users} label="Users" onClick={() => setActiveTab('USERS')} color="blue" count={users.length} />
                  <DashboardCard icon={Gift} label="Gift Codes" onClick={() => setActiveTab('CODES')} color="pink" />
                  <DashboardCard icon={Book} label="Subjects" onClick={() => setActiveTab('SUBJECTS_MGR')} color="emerald" />
                  <DashboardCard icon={Megaphone} label="Demands" onClick={() => setActiveTab('DEMAND')} color="orange" count={demands.length} />
                  <DashboardCard icon={Key} label="Login Reqs" onClick={() => setActiveTab('ACCESS')} color="purple" count={recoveryRequests.filter(r => r.status === 'PENDING').length} />
                  
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6 h-px bg-slate-100 my-2"></div>
                  
                  <DashboardCard icon={ListChecks} label="Syllabus" onClick={() => setActiveTab('SYLLABUS_MANAGER')} color="indigo" />
                  <DashboardCard icon={FileText} label="PDF Material" onClick={() => setActiveTab('CONTENT_PDF')} color="cyan" />
                  <DashboardCard icon={CheckCircle} label="Practice MCQs" onClick={() => setActiveTab('CONTENT_MCQ')} color="purple" />
                  <DashboardCard icon={AlertOctagon} label="Weekly Tests" onClick={() => setActiveTab('CONTENT_TEST')} color="orange" />
                  
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6 h-px bg-slate-100 my-2"></div>

                  <DashboardCard icon={Monitor} label="General" onClick={() => setActiveTab('CONFIG_GENERAL')} color="blue" />
                  <DashboardCard icon={ShieldCheck} label="Security" onClick={() => setActiveTab('CONFIG_SECURITY')} color="red" />
                  <DashboardCard icon={Eye} label="Visibility" onClick={() => setActiveTab('CONFIG_VISIBILITY')} color="cyan" />
                  <DashboardCard icon={BrainCircuit} label="AI Brain" onClick={() => setActiveTab('CONFIG_AI')} color="violet" />
                  <DashboardCard icon={Sparkles} label="Ads Config" onClick={() => setActiveTab('CONFIG_ADS')} color="rose" />
                  <DashboardCard icon={Banknote} label="Payment" onClick={() => setActiveTab('CONFIG_PAYMENT')} color="emerald" />
                  
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6 h-px bg-slate-100 my-2"></div>

                  <DashboardCard icon={Bell} label="Notices" onClick={() => setActiveTab('NOTICES')} color="pink" />
                  <DashboardCard icon={Database} label="Database" onClick={() => setActiveTab('DATABASE')} color="gray" />
                  <DashboardCard icon={Trash2} label="Recycle Bin" onClick={() => setActiveTab('RECYCLE')} color="red" count={recycleBin.length} />
                  <DashboardCard icon={LogOut} label="Exit" onClick={() => onNavigate('BOARDS')} color="slate" />
              </div>
          </div>
      )}

      {/* 2. SYLLABUS MANAGER */}
      {activeTab === 'SYLLABUS_MANAGER' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right">
              <div className="flex items-center gap-4 mb-6 border-b pb-4">
                  <button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button>
                  <h3 className="text-xl font-black text-indigo-800">Syllabus Manager</h3>
              </div>
              <SubjectSelector />
              {selSubject && (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <h4 className="font-bold text-indigo-900">Chapters: {selSubject.name}</h4>
                          <div className="flex gap-2">
                              <button onClick={() => setSelChapters([...selChapters, { id: `manual-${Date.now()}`, title: 'New Chapter' }])} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs">+ Add Chapter</button>
                              <button onClick={saveSyllabusList} className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow">Save List</button>
                          </div>
                      </div>
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                          {selChapters.map((ch, idx) => (
                              <div key={ch.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <span className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                                  <input 
                                      type="text" 
                                      value={ch.title} 
                                      onChange={(e) => { const up = [...selChapters]; up[idx].title = e.target.value; setSelChapters(up); }}
                                      className="flex-1 p-2 border border-slate-200 rounded text-sm font-medium focus:border-indigo-500 outline-none"
                                  />
                                  <button onClick={() => deleteChapter(idx)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* 3. CONTENT MANAGERS (PDF, MCQ, TEST) */}
      {['CONTENT_PDF', 'CONTENT_MCQ', 'CONTENT_TEST'].includes(activeTab) && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right">
              <div className="flex items-center gap-4 mb-6 border-b pb-4">
                  <button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button>
                  <h3 className="text-xl font-black text-slate-800">
                      {activeTab === 'CONTENT_PDF' ? 'PDF Study Material' : activeTab === 'CONTENT_MCQ' ? 'Practice MCQs' : 'Weekly Tests'}
                  </h3>
              </div>
              <SubjectSelector />
              
              {/* LIST VIEW */}
              {selSubject && !editingChapterId && (
                  <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
                      {selChapters.map((ch) => (
                          <div key={ch.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <span className="font-bold text-slate-700 text-sm">{ch.title}</span>
                              <button onClick={() => loadChapterContent(ch.id)} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-200">
                                  {activeTab === 'CONTENT_PDF' ? 'Edit Links' : 'Manage Questions'}
                              </button>
                          </div>
                      ))}
                  </div>
              )}

              {/* EDITOR VIEW */}
              {editingChapterId && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-right">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                          <div>
                              <h4 className="font-black text-slate-800 text-lg">{selChapters.find(c => c.id === editingChapterId)?.title}</h4>
                              <p className="text-xs text-slate-500">Editing Content</p>
                          </div>
                          <button onClick={() => setEditingChapterId(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close Editor</button>
                      </div>
                      
                      {/* PDF EDITOR */}
                      {activeTab === 'CONTENT_PDF' && (
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Free PDF Link</label>
                                  <div className="flex items-center bg-white border rounded-xl overflow-hidden">
                                      <div className="bg-slate-100 p-3"><Link size={16} className="text-slate-400" /></div>
                                      <input type="text" value={editConfig.freeLink || ''} onChange={e => setEditConfig({...editConfig, freeLink: e.target.value})} className="flex-1 p-3 outline-none text-sm" placeholder="https://drive.google.com..." />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Premium PDF Link</label>
                                  <div className="flex items-center bg-white border rounded-xl overflow-hidden">
                                      <div className="bg-slate-100 p-3"><Link size={16} className="text-purple-400" /></div>
                                      <input type="text" value={editConfig.premiumLink || ''} onChange={e => setEditConfig({...editConfig, premiumLink: e.target.value})} className="flex-1 p-3 outline-none text-sm" placeholder="https://..." />
                                  </div>
                              </div>
                              <button onClick={saveChapterContent} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow hover:bg-blue-700">Save PDF Links</button>
                          </div>
                      )}

                      {/* MCQ / TEST EDITOR */}
                      {(activeTab === 'CONTENT_MCQ' || activeTab === 'CONTENT_TEST') && (
                          <div className="space-y-4">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold text-slate-700">Total Questions: {(activeTab === 'CONTENT_TEST' ? editingTestMcqs : editingMcqs).length}</span>
                                  <div className="flex gap-2">
                                      <button onClick={() => addMcq(activeTab === 'CONTENT_TEST')} className="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50">+ Add Question</button>
                                      <button onClick={saveChapterContent} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-blue-700">Save All</button>
                                  </div>
                              </div>
                              
                              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 pb-10">
                                  {(activeTab === 'CONTENT_TEST' ? editingTestMcqs : editingMcqs).map((q, idx) => (
                                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                          <button onClick={() => removeMcq(activeTab === 'CONTENT_TEST', idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                          <div className="flex gap-2 mb-2">
                                              <span className="bg-slate-100 text-slate-500 font-bold w-6 h-6 flex items-center justify-center rounded text-xs mt-1">{idx + 1}</span>
                                              <textarea 
                                                  value={q.question} 
                                                  onChange={e => updateMcq(activeTab === 'CONTENT_TEST', idx, 'question', e.target.value)} 
                                                  className="flex-1 p-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                                                  rows={2} 
                                                  placeholder="Type question here..." 
                                              />
                                          </div>
                                          <div className="grid grid-cols-2 gap-3 ml-8">
                                              {q.options.map((opt, oIdx) => (
                                                  <div key={oIdx} className="flex items-center gap-2">
                                                      <input 
                                                          type="radio" 
                                                          name={`q-${activeTab}-${idx}`} 
                                                          checked={q.correctAnswer === oIdx} 
                                                          onChange={() => updateMcq(activeTab === 'CONTENT_TEST', idx, 'correctAnswer', oIdx)}
                                                          className="accent-green-600"
                                                      />
                                                      <input 
                                                          type="text" 
                                                          value={opt} 
                                                          onChange={e => updateMcqOption(activeTab === 'CONTENT_TEST', idx, oIdx, e.target.value)}
                                                          className={`w-full p-1.5 border rounded text-xs ${q.correctAnswer === oIdx ? 'border-green-300 bg-green-50 text-green-800 font-bold' : 'border-slate-200'}`}
                                                          placeholder={`Option ${String.fromCharCode(65+oIdx)}`}
                                                      />
                                                  </div>
                                              ))}
                                          </div>
                                          <div className="ml-8 mt-2">
                                              <input 
                                                  type="text" 
                                                  value={q.explanation} 
                                                  onChange={e => updateMcq(activeTab === 'CONTENT_TEST', idx, 'explanation', e.target.value)}
                                                  className="w-full p-2 border border-dashed border-slate-300 rounded text-xs text-slate-600 bg-slate-50"
                                                  placeholder="Explanation (Optional)"
                                              />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}

      {/* 4. SETTINGS TABS */}
      {activeTab.startsWith('CONFIG_') && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6 border-b pb-4">
                  <button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button>
                  <h3 className="text-xl font-black text-slate-800">Settings: {activeTab.replace('CONFIG_', '')}</h3>
              </div>
              <div className="max-w-2xl space-y-6">
                  {/* GENERAL */}
                  {activeTab === 'CONFIG_GENERAL' && (
                      <>
                          <div><label className="text-xs font-bold uppercase text-slate-500">App Name</label><input type="text" value={localSettings.appName} onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                          <div><label className="text-xs font-bold uppercase text-slate-500">Login Screen Message</label><input type="text" value={localSettings.loginMessage} onChange={e => setLocalSettings({...localSettings, loginMessage: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                          <div className="flex items-center justify-between bg-red-50 p-4 rounded-xl border border-red-100">
                              <div><p className="font-bold text-red-800">Maintenance Mode</p><p className="text-xs text-red-600">Lock app for users</p></div>
                              <input type="checkbox" checked={localSettings.maintenanceMode} onChange={() => toggleSetting('maintenanceMode')} className="w-6 h-6 accent-red-600" />
                          </div>
                      </>
                  )}
                  {/* SECURITY */}
                  {activeTab === 'CONFIG_SECURITY' && (
                      <>
                          <div><label className="text-xs font-bold uppercase text-slate-500">Admin Email</label><input type="text" value={localSettings.adminEmail || ''} onChange={e => setLocalSettings({...localSettings, adminEmail: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                          <div><label className="text-xs font-bold uppercase text-slate-500">Admin Login Code</label><input type="text" value={localSettings.adminCode || ''} onChange={e => setLocalSettings({...localSettings, adminCode: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                          <div><label className="text-xs font-bold uppercase text-slate-500">API Keys (Comma Separated)</label><textarea value={localSettings.apiKeys.join(',')} onChange={e => setLocalSettings({...localSettings, apiKeys: e.target.value.split(',')})} className="w-full p-3 border rounded-xl h-32" /></div>
                      </>
                  )}
                  {/* VISIBILITY */}
                  {activeTab === 'CONFIG_VISIBILITY' && (
                      <div className="space-y-4">
                          <div>
                              <p className="font-bold text-slate-700 mb-2">Allowed Classes</p>
                              <div className="flex flex-wrap gap-2">
                                  {['6','7','8','9','10','11','12'].map(c => (
                                      <button key={c} onClick={() => setLocalSettings({...localSettings, allowedClasses: toggleItemInList(localSettings.allowedClasses, c as any)})} className={`px-4 py-2 rounded-lg border font-bold ${localSettings.allowedClasses?.includes(c as any) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{c}</button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
                  {/* AI & ADS & PAYMENT */}
                  {activeTab === 'CONFIG_AI' && (
                       <>
                          <div><label className="text-xs font-bold uppercase text-slate-500">AI Model</label><select value={localSettings.aiModel} onChange={e => setLocalSettings({...localSettings, aiModel: e.target.value})} className="w-full p-3 border rounded-xl"><option value="gemini-2.5-flash">Gemini Flash</option><option value="gemini-pro">Gemini Pro</option></select></div>
                          <div><label className="text-xs font-bold uppercase text-slate-500">Custom System Instruction</label><textarea value={localSettings.aiInstruction || ''} onChange={e => setLocalSettings({...localSettings, aiInstruction: e.target.value})} className="w-full p-3 border rounded-xl h-32" placeholder="You are a helpful teacher..." /></div>
                       </>
                  )}
                  {activeTab === 'CONFIG_PAYMENT' && (
                       <>
                          <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                              <div><p className="font-bold text-emerald-800">Enable Payments</p><p className="text-xs text-emerald-600">Show buy options to students</p></div>
                              <input type="checkbox" checked={localSettings.isPaymentEnabled} onChange={() => toggleSetting('isPaymentEnabled')} className="w-6 h-6 accent-emerald-600" />
                          </div>
                          <div><label className="text-xs font-bold uppercase text-slate-500">Admin Phone (WhatsApp)</label><input type="text" value={localSettings.adminPhone || ''} onChange={e => setLocalSettings({...localSettings, adminPhone: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                          
                          {/* PACKAGE MANAGER */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingBag size={18} /> Store Packages Manager</h4>
                              
                              <div className="grid gap-3 mb-6">
                                  {(!localSettings.packages || localSettings.packages.length === 0) && <p className="text-xs text-slate-400">No packages defined. Default list will be shown to users.</p>}
                                  {localSettings.packages?.map(pkg => (
                                      <div key={pkg.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                          <div>
                                              <p className="font-bold text-sm text-slate-800">{pkg.name}</p>
                                              <p className="text-xs text-slate-500">₹{pkg.price} = {pkg.credits} Credits</p>
                                          </div>
                                          <button onClick={() => removePackage(pkg.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                                      </div>
                                  ))}
                              </div>

                              <div className="flex gap-2 items-end">
                                  <div className="flex-1">
                                      <label className="text-[10px] font-bold uppercase text-slate-400">Name</label>
                                      <input type="text" placeholder="Pro Pack" value={newPkgName} onChange={e => setNewPkgName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                  </div>
                                  <div className="w-20">
                                      <label className="text-[10px] font-bold uppercase text-slate-400">Price (₹)</label>
                                      <input type="number" placeholder="99" value={newPkgPrice} onChange={e => setNewPkgPrice(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                  </div>
                                  <div className="w-20">
                                      <label className="text-[10px] font-bold uppercase text-slate-400">Credits</label>
                                      <input type="number" placeholder="50" value={newPkgCredits} onChange={e => setNewPkgCredits(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                  </div>
                                  <button onClick={addPackage} className="bg-emerald-600 text-white p-2 rounded-lg h-[38px] w-[38px] flex items-center justify-center hover:bg-emerald-700 shadow"><Plus size={20} /></button>
                              </div>
                          </div>
                       </>
                  )}
                  {activeTab === 'CONFIG_ADS' && (
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <div className="flex items-center justify-between mb-4">
                               <span className="font-bold">Startup Popup Ad</span>
                               <input type="checkbox" checked={localSettings.startupAd?.enabled} onChange={() => setLocalSettings({...localSettings, startupAd: {...localSettings.startupAd!, enabled: !localSettings.startupAd?.enabled}})} className="w-5 h-5 accent-blue-600" />
                           </div>
                           <input type="text" value={localSettings.startupAd?.title} onChange={e => setLocalSettings({...localSettings, startupAd: {...localSettings.startupAd!, title: e.target.value}})} className="w-full p-2 border rounded mb-2" placeholder="Ad Title" />
                           <div className="grid grid-cols-2 gap-2">
                               <input type="color" value={localSettings.startupAd?.bgColor} onChange={e => setLocalSettings({...localSettings, startupAd: {...localSettings.startupAd!, bgColor: e.target.value}})} className="w-full h-10 p-1 border rounded" />
                               <input type="color" value={localSettings.startupAd?.textColor} onChange={e => setLocalSettings({...localSettings, startupAd: {...localSettings.startupAd!, textColor: e.target.value}})} className="w-full h-10 p-1 border rounded" />
                           </div>
                       </div>
                  )}
              </div>
          </div>
      )}

      {/* 5. UTILITY TABS */}
      {activeTab === 'DEMAND' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button><h3 className="text-xl font-black text-slate-800">User Demands</h3></div>
              <div className="space-y-3">
                  {demands.length === 0 && <p className="text-slate-400">No demands yet.</p>}
                  {demands.map((d, i) => (
                      <div key={i} className="p-4 border rounded-xl bg-slate-50 flex justify-between items-start">
                          <div>
                              <p className="font-bold text-slate-800">{d.details}</p>
                              <p className="text-xs text-slate-400 mt-1">{new Date(d.timestamp).toLocaleString()}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">{d.id}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      {activeTab === 'ACCESS' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button><h3 className="text-xl font-black text-slate-800">Login Requests</h3></div>
              <div className="space-y-3">
                  {recoveryRequests.filter(r => r.status === 'PENDING').length === 0 && <p className="text-slate-400">No pending requests.</p>}
                  {recoveryRequests.filter(r => r.status === 'PENDING').map((req) => (
                      <div key={req.id} className="p-4 border rounded-xl bg-slate-50 flex justify-between items-center">
                          <div><p className="font-bold text-slate-800">{req.name}</p><p className="text-xs text-slate-500 font-mono">{req.mobile} • {req.id}</p></div>
                          <button onClick={() => handleApproveRequest(req)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow hover:bg-green-700">Approve Access</button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'DATABASE' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button><h3 className="text-xl font-black text-slate-800">Database Viewer</h3></div>
              <div className="bg-slate-900 rounded-xl p-4">
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {['nst_users', 'nst_system_settings', 'nst_activity_log', 'nst_iic_posts', 'nst_leaderboard'].map(k => (
                          <button key={k} onClick={() => setDbKey(k)} className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap ${dbKey === k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{k}</button>
                      ))}
                  </div>
                  <textarea value={dbContent} onChange={e => setDbContent(e.target.value)} className="w-full h-96 bg-slate-950 text-green-400 font-mono text-xs p-4 rounded-lg focus:outline-none border border-slate-800 resize-none" spellCheck={false} />
                  <button onClick={() => { localStorage.setItem(dbKey, dbContent); alert("Database Updated Forcefully!"); }} className="mt-4 bg-red-600 text-white px-6 py-3 rounded-lg font-bold w-full hover:bg-red-700">⚠️ SAVE CHANGES (DANGEROUS)</button>
              </div>
          </div>
      )}

      {activeTab === 'NOTICES' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
               <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button><h3 className="text-xl font-black text-slate-800">Notices & Marquee</h3></div>
               <div className="space-y-6">
                   <div>
                       <label className="text-xs font-bold uppercase text-red-600 mb-1 block">Top Red Marquee</label>
                       <input type="text" value={localSettings.liveMessage1 || ''} onChange={e => setLocalSettings({...localSettings, liveMessage1: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Urgent message..." />
                   </div>
                   <div>
                       <label className="text-xs font-bold uppercase text-blue-600 mb-1 block">Bottom Blue Marquee</label>
                       <input type="text" value={localSettings.liveMessage2 || ''} onChange={e => setLocalSettings({...localSettings, liveMessage2: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Info message..." />
                   </div>
                   <div>
                       <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Scrolling Announcements (Comma Separated)</label>
                       <textarea value={localSettings.marqueeLines.join(',')} onChange={e => setLocalSettings({...localSettings, marqueeLines: e.target.value.split(',')})} className="w-full p-3 border rounded-xl h-24" />
                   </div>
                   <button onClick={() => { localStorage.setItem('nst_global_message', localSettings.liveMessage1 || ''); handleSaveSettings(); }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800">Publish Notices</button>
               </div>
          </div>
      )}

      {/* --- GIFT CODES TAB --- */}
      {activeTab === 'CODES' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right">
              <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button>
                  <h3 className="text-xl font-black text-slate-800">Gift Code Generator</h3>
              </div>
              
              <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 mb-8">
                  <div className="flex flex-wrap gap-4 items-end">
                      <div>
                          <label className="text-xs font-bold text-pink-700 uppercase block mb-1">Credits Amount</label>
                          <input type="number" value={newCodeAmount} onChange={e => setNewCodeAmount(Number(e.target.value))} className="p-3 rounded-xl border border-pink-200 w-32 font-bold" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-pink-700 uppercase block mb-1">Quantity</label>
                          <input type="number" value={newCodeCount} onChange={e => setNewCodeCount(Number(e.target.value))} className="p-3 rounded-xl border border-pink-200 w-32 font-bold" />
                      </div>
                      <button onClick={generateCodes} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-pink-700 flex items-center gap-2">
                          <Gift size={20} /> Generate Codes
                      </button>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr className="border-b"><th className="p-3">Code</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
                      <tbody>
                          {giftCodes.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No codes generated yet.</td></tr>}
                          {giftCodes.map(code => (
                              <tr key={code.id} className="border-b last:border-0 hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-slate-700">{code.code}</td>
                                  <td className="p-3 font-bold text-pink-600">{code.amount} CR</td>
                                  <td className="p-3">{code.isRedeemed ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Redeemed</span> : <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">Active</span>}</td>
                                  <td className="p-3 text-right"><button onClick={() => deleteCode(code.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- SUBJECT MANAGER TAB --- */}
      {activeTab === 'SUBJECTS_MGR' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-right">
              <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button>
                  <h3 className="text-xl font-black text-slate-800">Custom Subject Manager</h3>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8">
                  <div className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1">
                          <label className="text-xs font-bold text-emerald-700 uppercase block mb-1">Subject Name</label>
                          <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="e.g. Physical Education" className="p-3 rounded-xl border border-emerald-200 w-full" />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs font-bold text-emerald-700 uppercase block mb-1">Icon Style</label>
                          <select value={newSubIcon} onChange={e => setNewSubIcon(e.target.value)} className="p-3 rounded-xl border border-emerald-200 w-full bg-white">
                              <option value="book">Book</option>
                              <option value="science">Flask</option>
                              <option value="math">Calculator</option>
                              <option value="globe">Globe</option>
                              <option value="computer">Computer</option>
                              <option value="active">Activity</option>
                          </select>
                      </div>
                      <button onClick={addSubject} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700">
                          Add Subject
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.values({...DEFAULT_SUBJECTS, ...customSubjects}).map((sub: any) => (
                      <div key={sub.id} className="p-4 border rounded-xl flex items-center gap-3 bg-white">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sub.color}`}>
                              <Book size={20} />
                          </div>
                          <div>
                              <p className="font-bold text-sm">{sub.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase">{sub.id}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- USERS TAB (Enhanced) --- */}
      {activeTab === 'USERS' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button><h3 className="text-xl font-black text-slate-800">User Management</h3></div>
              <div className="relative mb-6">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input type="text" placeholder="Search by Name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500"><tr className="uppercase text-xs"><th className="p-4">User</th><th className="p-4">Credits</th><th className="p-4">Role</th><th className="p-4 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                          {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm)).map(u => (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4"><p className="font-bold text-slate-800">{u.name}</p><p className="text-xs text-slate-400 font-mono">{u.id}</p></td>
                                  <td className="p-4 font-bold text-blue-600">{u.credits}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                                  <td className="p-4 text-right flex justify-end gap-2">
                                      {u.role !== 'ADMIN' && (
                                          <>
                                              <button onClick={() => setDmUser(u)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg" title="Message"><MessageSquare size={16} /></button>
                                              <button onClick={() => openEditUser(u)} className="p-2 text-slate-400 hover:text-orange-600 bg-slate-50 rounded-lg" title="Edit"><Edit3 size={16} /></button>
                                              <button onClick={() => onImpersonate && onImpersonate(u)} className="p-2 text-slate-400 hover:text-green-600 bg-slate-50 rounded-lg" title="Login as User"><Eye size={16} /></button>
                                              <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                                          </>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-lg font-bold mb-4">Edit User: {editingUser.name}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Credits</label>
                          <input type="number" value={editUserCredits} onChange={e => setEditUserCredits(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                          <input type="text" value={editUserPass} onChange={e => setEditUserPass(e.target.value)} className="w-full p-2 border rounded-lg" />
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button onClick={() => setEditingUser(null)} className="flex-1 py-2 text-slate-500">Cancel</button>
                          <button onClick={saveEditedUser} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Changes</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- DM USER MODAL --- */}
      {dmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-lg font-bold mb-4">Message to {dmUser.name}</h3>
                  <textarea value={dmText} onChange={e => setDmText(e.target.value)} className="w-full h-32 p-3 border rounded-xl mb-4" placeholder="Type your message here..." />
                  <div className="flex gap-2">
                      <button onClick={() => setDmUser(null)} className="flex-1 py-2 text-slate-500">Cancel</button>
                      <button onClick={sendDirectMessage} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Mail size={16} /> Send</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'RECYCLE' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6"><button onClick={() => setActiveTab('DASHBOARD')} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ArrowLeft size={20} /></button><h3 className="text-xl font-black text-slate-800">Recycle Bin (90 Days)</h3></div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500"><tr className="uppercase text-xs"><th className="p-4">Item</th><th className="p-4">Type</th><th className="p-4">Deleted</th><th className="p-4 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                          {recycleBin.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">Bin is empty.</td></tr>}
                          {recycleBin.map(item => (
                              <tr key={item.id} className="hover:bg-red-50 transition-colors">
                                  <td className="p-4 font-bold text-slate-700">{item.name}</td>
                                  <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">{item.type}</span></td>
                                  <td className="p-4 text-xs text-slate-500">{new Date(item.deletedAt).toLocaleDateString()}</td>
                                  <td className="p-4 text-right flex justify-end gap-2">
                                      <button onClick={() => handleRestoreItem(item)} className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"><RotateCcw size={16} /></button>
                                      <button onClick={() => handlePermanentDelete(item.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><X size={16} /></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

    </div>
  );
};
