
import React, { useState, useEffect, useMemo } from 'react';
import { User, MeetingPoint, AppState, Coordinates, FriendCircle, SubsplashEvent, Language } from './types';
import { calculateDistance } from './utils/geo';
import { fetchSubsplashEvents } from './services/geminiService';
import Radar from './components/Radar';
import ChatOverlay from './components/ChatOverlay';

const PRESET_AVATARS = [
  'https://i.pravatar.cc/150?u=1', 'https://i.pravatar.cc/150?u=2', 'https://i.pravatar.cc/150?u=3', 
  'https://i.pravatar.cc/150?u=4', 'https://i.pravatar.cc/150?u=5', 'https://i.pravatar.cc/150?u=6'
];

const COLORS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'violet'];
const ICONS = ['fa-users', 'fa-church', 'fa-heart', 'fa-star', 'fa-location-dot', 'fa-comments'];

const TRANSLATIONS = {
  en: {
    app_name: 'PontoX',
    groups: 'Groups',
    radar: 'Radar',
    community: 'Community',
    settings: 'Profile',
    new_group: 'New Group',
    edit_group: 'Edit Group',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    share: 'Invite',
    radar_off: 'Radar Waiting',
    mark_local_now: 'Activate Radar Here',
    gps_error: 'GPS disabled or search timed out. Please check permissions.',
    community_search: 'Community Name (e.g. Central Church)',
    fetch_events: 'Search Events',
    no_events: 'No events found.',
    mark_from_event: 'Mark this Event',
    profile_name: 'Your Name',
    choose_avatar: 'Choose your Avatar',
    language_select: 'Language / Idioma',
    finish: 'Finish',
    members_count: (n: number) => `${n} members`,
    online: 'Online',
    type_message: 'Type your message...',
    invite_msg: (groupName: string) => `Let's meet at group "${groupName}"? Track who is coming on the PontoX radar!`,
    you: 'You',
    reload: 'Reload App',
    clear_data: 'Reset App Data'
  },
  pt: {
    app_name: 'PontoX',
    groups: 'Grupos',
    radar: 'Radar',
    community: 'Comunidade',
    settings: 'Perfil',
    new_group: 'Novo Grupo',
    edit_group: 'Editar Grupo',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    share: 'Convidar',
    radar_off: 'Radar Aguardando',
    mark_local_now: 'Ativar Radar Aqui',
    gps_error: 'GPS desativado ou tempo esgotado. Verifique as permissões.',
    community_search: 'Nome da Comunidade (ex: Igreja Central)',
    fetch_events: 'Buscar Eventos',
    no_events: 'Nenhum evento encontrado.',
    mark_from_event: 'Marcar este Evento',
    profile_name: 'Seu Nome',
    choose_avatar: 'Escolha seu Avatar',
    language_select: 'Idioma',
    finish: 'Encerrar',
    members_count: (n: number) => `${n} membros`,
    online: 'Online',
    type_message: 'Digite sua mensagem...',
    invite_msg: (groupName: string) => `Bora se encontrar no grupo "${groupName}"? Acompanhe quem está chegando pelo radar do PontoX!`,
    you: 'Você',
    reload: 'Recarregar App',
    clear_data: 'Limpar Tudo'
  }
};

const INITIAL_CIRCLES: FriendCircle[] = [
  { 
    id: 'c1', 
    name: 'My Friends', 
    icon: 'fa-users', 
    color: 'indigo', 
    activeMeetingPoint: null, 
    members: [
      { id: 'f1', name: 'Richard', avatar: 'https://i.pravatar.cc/150?u=ric', isNearby: false, status: 'active', location: { latitude: -23.560, longitude: -46.655 } },
      { id: 'f2', name: 'Julia', avatar: 'https://i.pravatar.cc/150?u=jul', isNearby: false, status: 'active', location: { latitude: -23.562, longitude: -46.657 } }
    ] 
  },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedCircles = JSON.parse(localStorage.getItem('pontox_circles') || 'null');
    const savedUser = JSON.parse(localStorage.getItem('pontox_user') || 'null');
    const savedLang = (localStorage.getItem('pontox_lang') as Language) || 'en';
    
    return {
      currentUser: savedUser || { id: '1', name: 'You', avatar: PRESET_AVATARS[0], isNearby: false, status: 'active' },
      circles: savedCircles || INITIAL_CIRCLES,
      activeCircleId: (savedCircles && savedCircles.length > 0) ? savedCircles[0].id : INITIAL_CIRCLES[0].id,
      isTracking: false,
      error: null,
      selectedUserForChat: null,
      messages: [],
      viewMode: 'radar',
      subsplashEvents: [],
      archivedEvents: [],
      language: savedLang,
    };
  });

  const [activeTab, setActiveTab] = useState<'radar' | 'circles' | 'settings' | 'history'>('circles');
  const [editingCircle, setEditingCircle] = useState<FriendCircle | null>(null);
  const [communityName, setCommunityName] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);

  const t = TRANSLATIONS[state.language];
  const activeCircle = useMemo(() => state.circles.find(c => c.id === state.activeCircleId) || state.circles[0], [state.circles, state.activeCircleId]);

  useEffect(() => {
    localStorage.setItem('pontox_circles', JSON.stringify(state.circles));
    localStorage.setItem('pontox_user', JSON.stringify(state.currentUser));
    localStorage.setItem('pontox_lang', state.language);
  }, [state.circles, state.currentUser, state.language]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setState(prev => ({ 
            ...prev, 
            currentUser: { ...prev.currentUser, location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } },
            isTracking: true,
            error: null 
          }));
        },
        (err) => {
          console.error("GPS Error:", err);
          setState(prev => ({ ...prev, error: t.gps_error }));
        },
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 20000 } // Menos agressivo no mobile
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [state.language]);

  const handleReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) registration.unregister();
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  const handleClearData = () => {
    if (confirm(state.language === 'en' ? 'Delete all local data?' : 'Apagar todos os dados locais?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleQuickMark = (customPoint?: MeetingPoint) => {
    const point = customPoint || {
      id: 'p-' + Date.now(),
      title: state.language === 'en' ? 'Active Meeting' : 'Encontro Ativo',
      description: state.language === 'en' ? 'Set on radar' : 'Definido no radar',
      date: new Date().toISOString(),
      locationName: state.language === 'en' ? 'Meeting Point' : 'Local de Encontro',
      address: '',
      coordinates: state.currentUser.location || { latitude: -23.56, longitude: -46.65 },
      radius: 1.0,
      attendance: ['1']
    };
    if (!state.currentUser.location && !customPoint) return alert(t.gps_error);
    
    setState(prev => ({
      ...prev,
      circles: prev.circles.map(c => c.id === prev.activeCircleId ? { ...c, activeMeetingPoint: point } : c)
    }));
    setActiveTab('radar');
  };

  const handleFetchEvents = async () => {
    if (!communityName) return;
    setLoadingEvents(true);
    const events = await fetchSubsplashEvents(communityName);
    setState(prev => ({ ...prev, subsplashEvents: events }));
    setLoadingEvents(false);
  };

  const shareGroup = async () => {
    const url = `${window.location.origin}/?join=${activeCircle.id}`;
    const message = t.invite_msg(activeCircle.name);
    if (navigator.share) {
      try {
        await navigator.share({ title: t.app_name, text: message, url });
      } catch (e) { console.log("Share cancelled"); }
    } else {
      await navigator.clipboard.writeText(`${message} ${url}`);
      alert(state.language === 'en' ? 'Link copied!' : 'Link copiado!');
    }
  };

  const saveEditedCircle = () => {
    if (!editingCircle) return;
    setState(prev => {
      const exists = prev.circles.find(c => c.id === editingCircle.id);
      const newCircles = exists 
        ? prev.circles.map(c => c.id === editingCircle.id ? editingCircle : c)
        : [...prev.circles, editingCircle];
      return { ...prev, circles: newCircles, activeCircleId: editingCircle.id };
    });
    setEditingCircle(null);
  };

  const deleteCircle = (id: string) => {
    setState(prev => {
      const filtered = prev.circles.filter(c => c.id !== id);
      return {
        ...prev,
        circles: filtered,
        activeCircleId: filtered.length > 0 ? filtered[0].id : ''
      };
    });
    setEditingCircle(null);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans pb-32">
      {state.error && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-rose-600 text-[10px] font-black uppercase text-center py-2 shadow-lg flex items-center justify-center gap-2">
          {state.error}
          <button onClick={() => setState(s => ({ ...s, error: null }))} className="bg-black/20 w-5 h-5 rounded-full">×</button>
        </div>
      )}

      <header className="p-6 pt-10 flex items-center justify-between">
        <div className="relative">
          <div className="absolute -inset-2 bg-indigo-500/20 blur-xl rounded-full opacity-50"></div>
          <h1 className="relative text-3xl font-black tracking-tighter italic bg-gradient-to-br from-white to-indigo-400 bg-clip-text text-transparent">{t.app_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${state.isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{activeCircle.name}</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('settings')} className={`relative w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${activeTab === 'settings' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'}`}>
          <img src={state.currentUser.avatar} className="w-8 h-8 rounded-full border border-white/20" alt="Profile" />
        </button>
      </header>

      <main className="flex-1 px-6 overflow-x-hidden">
        {activeTab === 'circles' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.groups}</h2>
              <button onClick={() => setEditingCircle({ id: 'c' + Date.now(), name: '', icon: 'fa-users', color: 'indigo', members: [], activeMeetingPoint: null })} className="bg-indigo-600/10 text-indigo-400 px-4 py-2 rounded-full text-[10px] font-black uppercase border border-indigo-500/20">
                + {t.new_group}
              </button>
            </div>
            
            <div className="space-y-4">
              {state.circles.map(circle => (
                <div key={circle.id} className={`group relative w-full flex items-center gap-5 p-6 rounded-[32px] border transition-all ${state.activeCircleId === circle.id ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-slate-900 border-slate-800/40'}`}>
                  <button onClick={() => { setState(s => ({ ...s, activeCircleId: circle.id })); setActiveTab('radar'); }} className="flex-1 flex items-center gap-5 text-left">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-800 text-${circle.color}-400 shadow-inner`}>
                      <i className={`fas ${circle.icon}`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{circle.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t.members_count(circle.members.length + 1)}</p>
                    </div>
                  </button>
                  <button onClick={() => setEditingCircle(circle)} className="p-3 text-slate-600 hover:text-white transition-colors">
                    <i className="fas fa-ellipsis-vertical"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="h-full flex flex-col items-center animate-in zoom-in-95 duration-500 pt-4">
            {!activeCircle.activeMeetingPoint ? (
              <div className="py-20 text-center space-y-8">
                <div className="w-24 h-24 bg-slate-900 rounded-[40px] border border-slate-800 flex items-center justify-center text-indigo-500 mx-auto shadow-2xl">
                  <i className="fas fa-tower-broadcast text-4xl"></i>
                </div>
                <h3 className="text-2xl font-black">{t.radar_off}</h3>
                <button onClick={() => handleQuickMark()} className="w-full px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                  {t.mark_local_now}
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <Radar meetingPoint={activeCircle.activeMeetingPoint} members={activeCircle.members} currentUser={state.currentUser} viewMode={state.viewMode} onMemberClick={(u) => setState(s => ({ ...s, selectedUserForChat: u }))} />
                <div className="mt-12 w-full grid grid-cols-2 gap-4">
                  <button onClick={shareGroup} className="py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-indigo-400 flex items-center justify-center gap-2"><i className="fas fa-link"></i> {t.share}</button>
                  <button onClick={() => setState(prev => ({ ...prev, circles: prev.circles.map(c => c.id === state.activeCircleId ? { ...c, activeMeetingPoint: null } : c) }))} className="py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-rose-500 flex items-center justify-center gap-2"><i className="fas fa-stop"></i> {t.finish}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.community}</h2>
                <div className="flex gap-2">
                  <input type="text" value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder={t.community_search} className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
                  <button onClick={handleFetchEvents} disabled={loadingEvents} className="bg-indigo-600 p-4 rounded-2xl disabled:opacity-50">
                    {loadingEvents ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                  </button>
                </div>
             </div>

             <div className="space-y-4">
               {state.subsplashEvents.length === 0 ? (
                 <div className="text-center py-10 text-slate-600 italic text-sm">{t.no_events}</div>
               ) : (
                 state.subsplashEvents.map(event => (
                   <div key={event.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4">
                     <div>
                       <h4 className="font-bold text-lg">{event.title}</h4>
                       <p className="text-xs text-indigo-400 font-medium">{new Date(event.date).toLocaleDateString(state.language === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                       <p className="text-xs text-slate-500 mt-2 line-clamp-2">{event.description}</p>
                     </div>
                     <button onClick={() => handleQuickMark({ ...event, radius: 1.0 })} className="w-full py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">
                       {t.mark_from_event}
                     </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in slide-in-from-top-4 duration-500 pb-10">
             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.profile_name}</h2>
                <input type="text" value={state.currentUser.name} onChange={(e) => setState(s => ({ ...s, currentUser: { ...s.currentUser, name: e.target.value } }))} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:border-indigo-500" />
             </div>

             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.language_select}</h2>
                <div className="flex gap-3">
                  <button onClick={() => setState(s => ({ ...s, language: 'en' }))} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase border transition-all ${state.language === 'en' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>English</button>
                  <button onClick={() => setState(s => ({ ...s, language: 'pt' }))} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase border transition-all ${state.language === 'pt' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Português</button>
                </div>
             </div>

             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.choose_avatar}</h2>
                <div className="grid grid-cols-3 gap-4">
                  {PRESET_AVATARS.map(avatar => (
                    <button key={avatar} onClick={() => setState(s => ({ ...s, currentUser: { ...s.currentUser, avatar } }))} className={`relative aspect-square rounded-[24px] overflow-hidden border-4 transition-all ${state.currentUser.avatar === avatar ? 'border-indigo-500 scale-105 shadow-xl shadow-indigo-600/20' : 'border-slate-800 grayscale'}`}>
                      <img src={avatar} className="w-full h-full object-cover" alt="" />
                      {state.currentUser.avatar === avatar && <div className="absolute top-2 right-2 bg-indigo-500 w-5 h-5 rounded-full flex items-center justify-center text-[8px]"><i className="fas fa-check"></i></div>}
                    </button>
                  ))}
                </div>
             </div>

             <div className="space-y-4 pt-6">
                <button onClick={handleReload} className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-black uppercase text-indigo-400">{t.reload}</button>
                <button onClick={handleClearData} className="w-full py-4 bg-rose-600/10 border border-rose-500/20 rounded-2xl text-xs font-black uppercase text-rose-500">{t.clear_data}</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 z-[100] max-w-md mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 p-2 rounded-[32px] flex justify-around shadow-2xl">
          {[
            { id: 'circles', icon: 'fa-layer-group', label: t.groups },
            { id: 'radar', icon: 'fa-bullseye', label: t.radar },
            { id: 'history', icon: 'fa-church', label: t.community }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center px-6 py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'text-white bg-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <i className={`fas ${tab.icon} text-lg mb-1`}></i>
              <span className="text-[8px] font-black uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modal de Edição de Grupo */}
      {editingCircle && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl p-8 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 rounded-[48px] border border-slate-800 p-8 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black tracking-tight">{editingCircle.name ? t.edit_group : t.new_group}</h2>
            
            <div className="space-y-4">
              <input type="text" placeholder={t.groups} value={editingCircle.name} onChange={(e) => setEditingCircle({ ...editingCircle, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:border-indigo-500" />
              
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setEditingCircle({ ...editingCircle, color: c })} className={`w-10 h-10 rounded-full bg-${c}-600 border-4 ${editingCircle.color === c ? 'border-white' : 'border-transparent'}`} />
                ))}
              </div>

              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(i => (
                  <button key={i} onClick={() => setEditingCircle({ ...editingCircle, icon: i })} className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sm ${editingCircle.icon === i ? 'text-white bg-indigo-600' : 'text-slate-500'}`}>
                    <i className={`fas ${i}`}></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button onClick={saveEditedCircle} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">{t.save}</button>
              {editingCircle.id && state.circles.length > 1 && (
                <button onClick={() => deleteCircle(editingCircle.id)} className="w-full py-5 bg-rose-600/10 text-rose-500 rounded-2xl font-black uppercase text-xs tracking-widest">{t.delete}</button>
              )}
              <button onClick={() => setEditingCircle(null)} className="w-full py-5 bg-transparent text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {state.selectedUserForChat && (
        <ChatOverlay user={state.selectedUserForChat} messages={state.messages} onSendMessage={(txt) => {
          const msg = { id: Date.now().toString(), senderId: '1', text: txt, timestamp: Date.now() };
          setState(s => ({ ...s, messages: [...s.messages, msg] }));
        }} onClose={() => setState(s => ({ ...s, selectedUserForChat: null }))} language={state.language} />
      )}
    </div>
  );
};

export default App;
