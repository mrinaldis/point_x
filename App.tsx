
import React, { useState, useEffect, useMemo } from 'react';
import { User, MeetingPoint, AppState, Coordinates, FriendCircle } from './types';
import { calculateDistance } from './utils/geo';
import { generateAutoResponse } from './services/geminiService';
import Radar from './components/Radar';
import ChatOverlay from './components/ChatOverlay';

const PRESET_AVATARS = [
  'https://i.pravatar.cc/150?u=1', 'https://i.pravatar.cc/150?u=2', 'https://i.pravatar.cc/150?u=3', 'https://i.pravatar.cc/150?u=4', 'https://i.pravatar.cc/150?u=5',
];

const PRESET_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'violet', 'orange', 'pink'];
const PRESET_ICONS = ['fa-users', 'fa-house-chimney', 'fa-futbol', 'fa-briefcase', 'fa-car', 'fa-heart', 'fa-music', 'fa-bicycle'];

const TRANSLATIONS = {
  pt: {
    app_name: 'PontoX',
    groups: 'Grupos',
    mark: 'Marcar',
    radar: 'Radar',
    history: 'Histórico',
    settings: 'Ajustes',
    choose_group: 'Seus Grupos',
    friends_radar: 'Amigos',
    mark_now: 'Marcar Ponto Agora',
    mark_here: 'Marcar Aqui',
    radar_off: 'Radar Desativado',
    no_point: 'Nenhum ponto marcado para',
    mark_local_now: 'Marcar Local Agora',
    gps_error: 'GPS desativado. Ative a localização.',
    welcome_title: 'Bem-vindo ao PontoX!',
    welcome_step1: '1. Crie um grupo para seus amigos.',
    welcome_step2: '2. Marque o ponto de encontro.',
    welcome_step3: '3. Veja quem está a menos de 1 milha!',
    got_it: 'Começar',
    save: 'Salvar',
    cancel: 'Cancelar',
    new_group: 'Novo Grupo',
    finish_meetup: 'Encerrar Encontro'
  }
};

const INITIAL_CIRCLES: FriendCircle[] = [
  { 
    id: 'c1', 
    name: 'Meus Amigos', 
    icon: 'fa-users', 
    color: 'indigo', 
    activeMeetingPoint: null, 
    members: [
      { id: 'f1', name: 'Ricardo', avatar: 'https://i.pravatar.cc/150?u=a', isNearby: false, status: 'active', location: { latitude: -23.56, longitude: -46.65 } },
      { id: 'f2', name: 'Ana', avatar: 'https://i.pravatar.cc/150?u=b', isNearby: false, status: 'active', location: { latitude: -23.561, longitude: -46.651 } }
    ] 
  },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: { id: '1', name: 'Você', avatar: PRESET_AVATARS[0], isNearby: false, status: 'active' },
    circles: INITIAL_CIRCLES,
    activeCircleId: INITIAL_CIRCLES[0].id,
    isTracking: false,
    error: null,
    selectedUserForChat: null,
    messages: [],
    viewMode: 'radar',
    subsplashEvents: [],
    archivedEvents: [],
    language: 'pt',
  });

  const [activeTab, setActiveTab] = useState<'radar' | 'circles' | 'settings' | 'history'>('circles');
  const [editingCircle, setEditingCircle] = useState<FriendCircle | null>(null);
  const [showHelp, setShowHelp] = useState(!localStorage.getItem('pontox_help_seen'));

  const t = TRANSLATIONS[state.language];
  const activeCircle = useMemo(() => state.circles.find(c => c.id === state.activeCircleId) || state.circles[0], [state.circles, state.activeCircleId]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => {
          setState(prev => ({ 
            ...prev, 
            currentUser: { ...prev.currentUser, location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } },
            isTracking: true,
            error: null 
          }));
        },
        () => setState(prev => ({ ...prev, error: t.gps_error }))
      );
    }
  }, []);

  const handleQuickMark = () => {
    if (!state.currentUser.location) return alert(t.gps_error);
    const newPoint: MeetingPoint = {
      id: 'p-' + Date.now(),
      title: 'Ponto de Encontro',
      description: 'Definido agora',
      date: new Date().toISOString(),
      locationName: 'Local Atual',
      address: '',
      coordinates: state.currentUser.location,
      radius: 1.0,
      attendance: ['1']
    };
    setState(prev => ({
      ...prev,
      circles: prev.circles.map(c => c.id === prev.activeCircleId ? { ...c, activeMeetingPoint: newPoint } : c)
    }));
    setActiveTab('radar');
  };

  const archiveMeetup = () => {
    if (activeCircle.activeMeetingPoint) {
      setState(prev => ({
        ...prev,
        archivedEvents: [activeCircle.activeMeetingPoint!, ...prev.archivedEvents],
        circles: prev.circles.map(c => c.id === state.activeCircleId ? { ...c, activeMeetingPoint: null } : c)
      }));
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans pb-24">
      {state.error && <div className="bg-rose-600 text-[10px] font-black text-center py-2 animate-pulse">{state.error}</div>}

      <header className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tighter">{t.app_name}</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{activeCircle.name}</p>
          </div>
          <button onClick={() => setActiveTab('settings')} className="w-10 h-10 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center">
            <i className="fas fa-cog text-slate-400"></i>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6">
        {activeTab === 'circles' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">{t.choose_group}</h2>
              <button onClick={() => setEditingCircle({ id: '', name: '', icon: 'fa-users', color: 'indigo', members: [], activeMeetingPoint: null })} className="text-[10px] font-black text-indigo-400">+ {t.new_group}</button>
            </div>
            {state.circles.map(circle => (
              <button key={circle.id} onClick={() => { setState(s => ({ ...s, activeCircleId: circle.id })); setActiveTab('radar'); }} className={`w-full flex items-center gap-4 p-4 rounded-3xl border ${state.activeCircleId === circle.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-900 border-slate-800'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${circle.color}-600/20 text-${circle.color}-400`}>
                  <i className={`fas ${circle.icon}`}></i>
                </div>
                <div className="text-left">
                  <h3 className="font-black">{circle.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{circle.members.length} membros</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="h-full flex flex-col items-center">
            {!activeCircle.activeMeetingPoint ? (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800">
                  <i className="fas fa-satellite-dish text-3xl text-slate-700"></i>
                </div>
                <h3 className="font-black mb-2">{t.radar_off}</h3>
                <p className="text-xs text-slate-500 mb-8">{t.no_point} "{activeCircle.name}".</p>
                <button onClick={handleQuickMark} className="px-8 py-4 bg-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                  {t.mark_local_now}
                </button>
              </div>
            ) : (
              <>
                <Radar 
                  meetingPoint={activeCircle.activeMeetingPoint} 
                  members={activeCircle.members} 
                  currentUser={state.currentUser}
                  viewMode={state.viewMode}
                  onMemberClick={(u) => setState(s => ({ ...s, selectedUserForChat: u }))}
                />
                <button onClick={archiveMeetup} className="mt-8 w-full py-4 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-500">
                  {t.finish_meetup}
                </button>
              </>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-2 rounded-[32px] flex justify-around shadow-2xl">
          {[
            { id: 'circles', icon: 'fa-users', label: 'Grupos' },
            { id: 'radar', icon: 'fa-satellite', label: 'Radar' },
            { id: 'history', icon: 'fa-clock', label: 'Histórico' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center p-3 rounded-2xl transition-all ${activeTab === tab.id ? 'text-indigo-400 scale-110' : 'text-slate-500'}`}>
              <i className={`fas ${tab.icon} mb-1`}></i>
              <span className="text-[8px] font-black uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {showHelp && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 flex items-center justify-center p-8 backdrop-blur-md">
          <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 text-center space-y-6 max-w-xs shadow-2xl">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto"><i className="fas fa-location-dot text-2xl"></i></div>
            <h2 className="text-xl font-black">{t.welcome_title}</h2>
            <div className="text-left text-sm text-slate-400 space-y-2">
              <p>{t.welcome_step1}</p><p>{t.welcome_step2}</p><p>{t.welcome_step3}</p>
            </div>
            <button onClick={() => { setShowHelp(false); localStorage.setItem('pontox_help_seen', 'true'); }} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase text-xs">{t.got_it}</button>
          </div>
        </div>
      )}

      {state.selectedUserForChat && (
        <ChatOverlay user={state.selectedUserForChat} messages={state.messages} onSendMessage={(txt) => {
          const msg = { id: Date.now().toString(), senderId: '1', text: txt, timestamp: Date.now() };
          setState(s => ({ ...s, messages: [...s.messages, msg] }));
        }} onClose={() => setState(s => ({ ...s, selectedUserForChat: null }))} />
      )}
    </div>
  );
};

export default App;
