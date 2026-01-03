
import React, { useState, useEffect, useMemo } from 'react';
import { User, MeetingPoint, AppState, Coordinates, FriendCircle, SubsplashEvent, Language } from './types';
import { calculateDistance } from './utils/geo';
import { fetchSubsplashEvents, resolveLocation } from './services/geminiService';
import Radar from './components/Radar';
import ChatOverlay from './components/ChatOverlay';
import LocationPicker from './components/LocationPicker';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/big-smiles/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/big-smiles/svg?seed=Aneka&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/big-smiles/svg?seed=Bubba&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bear&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Coco&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Jordan&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Taylor&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Sassy&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Bailey&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Kim&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4,c0aede,d1d4f9'
];

const COLORS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'violet'];
const ICONS = ['fa-users', 'fa-church', 'fa-heart', 'fa-star', 'fa-location-dot', 'fa-comments'];

const TRANSLATIONS = {
  en: {
    app_name: 'PointX',
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
    radar_off: 'Radar Idle',
    mark_local_now: 'Mark My Location',
    mark_custom_place: 'Search Place',
    pick_on_map: 'Pick on Map',
    gps_error: 'GPS disabled. Please enable to use the radar.',
    place_search_placeholder: 'Search for a place...',
    fetch_events: 'Search Events',
    no_events: 'No events found.',
    mark_from_event: 'Mark this Event',
    profile_name: 'Your Name',
    choose_avatar: 'Choose Persona',
    language_select: 'Language',
    finish: 'Finish',
    members_count: (n: number) => `${n} members`,
    invite_msg: (groupName: string) => `Join my group "${groupName}" on PointX!`,
    reload: 'Reload',
    clear_data: 'Reset App',
    map_view: 'Map View',
    confirm_location: 'Confirm Location'
  },
  pt: {
    app_name: 'PointX',
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
    radar_off: 'Radar Inativo',
    mark_local_now: 'Marcar Meu Local',
    mark_custom_place: 'Buscar Lugar',
    pick_on_map: 'Escolher no Mapa',
    gps_error: 'GPS desativado. Ative para usar o radar.',
    place_search_placeholder: 'Buscar um lugar...',
    fetch_events: 'Buscar Eventos',
    no_events: 'Nenhum evento encontrado.',
    mark_from_event: 'Marcar este Evento',
    profile_name: 'Seu Nome',
    choose_avatar: 'Escolha seu Persona',
    language_select: 'Idioma',
    finish: 'Encerrar',
    members_count: (n: number) => `${n} membros`,
    invite_msg: (groupName: string) => `Entre no meu grupo "${groupName}" no PointX!`,
    reload: 'Recarregar',
    clear_data: 'Limpar Tudo',
    map_view: 'Ver Mapa',
    confirm_location: 'Confirmar Local'
  }
};

const INITIAL_CIRCLES: FriendCircle[] = [
  { 
    id: 'c1', 
    name: 'Main Group', 
    icon: 'fa-users', 
    color: 'indigo', 
    activeMeetingPoint: null, 
    members: [] 
  },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedCircles = JSON.parse(localStorage.getItem('pointx_circles_v2') || 'null');
    const savedUser = JSON.parse(localStorage.getItem('pointx_user_v2') || 'null');
    const savedLang = (localStorage.getItem('pointx_lang_v2') as Language) || 'en';
    
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
  const [placeSearch, setPlaceSearch] = useState('');
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);

  const t = TRANSLATIONS[state.language];
  const activeCircle = useMemo(() => state.circles.find(c => c.id === state.activeCircleId) || state.circles[0], [state.circles, state.activeCircleId]);

  useEffect(() => {
    localStorage.setItem('pointx_circles_v2', JSON.stringify(state.circles));
    localStorage.setItem('pointx_user_v2', JSON.stringify(state.currentUser));
    localStorage.setItem('pointx_lang_v2', state.language);
  }, [state.circles, state.currentUser, state.language]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinData = params.get('joinData');
    if (joinData) {
      try {
        const decoded = JSON.parse(atob(joinData));
        setState(prev => {
          if (prev.circles.find(c => c.id === decoded.id)) return prev;
          return { ...prev, circles: [...prev.circles, decoded], activeCircleId: decoded.id };
        });
        window.history.replaceState({}, document.title, window.location.pathname);
        setActiveTab('circles');
      } catch (e) { console.error("Invite error", e); }
    }
  }, []);

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
        (err) => setState(prev => ({ ...prev, error: t.gps_error })),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [state.language]);

  const handleSetMeetingPoint = (coords: Coordinates, title: string) => {
    const point: MeetingPoint = {
      id: 'p-' + Date.now(),
      title: title || 'Meeting Point',
      description: 'Defined via Map',
      date: new Date().toISOString(),
      locationName: title || 'Meeting Point',
      address: '',
      coordinates: coords,
      radius: 1.0,
      attendance: ['1']
    };
    
    setState(prev => ({
      ...prev,
      circles: prev.circles.map(c => c.id === prev.activeCircleId ? { ...c, activeMeetingPoint: point } : c)
    }));
    setIsPickingOnMap(false);
    setActiveTab('radar');
  };

  const shareGroup = async () => {
    const data = btoa(JSON.stringify({
      id: activeCircle.id,
      name: activeCircle.name,
      icon: activeCircle.icon,
      color: activeCircle.color,
      members: []
    }));
    const url = `${window.location.origin}${window.location.pathname}?joinData=${data}`;
    const message = t.invite_msg(activeCircle.name);
    
    if (navigator.share) {
      try { await navigator.share({ title: 'PointX', text: message, url }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(`${message} ${url}`);
      alert("Invitation link copied!");
    }
  };

  const handleSearchPlace = async () => {
    if (!placeSearch) return;
    setIsSearchingPlace(true);
    const coords = await resolveLocation(placeSearch);
    setIsSearchingPlace(false);
    if (coords) {
      handleSetMeetingPoint(coords, placeSearch);
    } else {
      alert("Place not found.");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans pb-32">
      {state.error && (
        <div className="fixed top-0 left-0 right-0 z-[250] bg-rose-600 text-[10px] font-black uppercase text-center py-2 shadow-lg">
          {state.error}
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
        <button onClick={() => setActiveTab('settings')} className={`relative w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all shadow-lg ${activeTab === 'settings' ? 'bg-indigo-600 border-indigo-400 scale-110' : 'bg-slate-900 border-slate-800'}`}>
          <img src={state.currentUser.avatar} className="w-9 h-9 rounded-full bg-slate-800" alt="Profile" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
        </button>
      </header>

      <main className="flex-1 px-6">
        {activeTab === 'circles' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.groups}</h2>
              <button onClick={() => setEditingCircle({ id: 'c' + Date.now(), name: '', icon: 'fa-users', color: 'indigo', members: [], activeMeetingPoint: null })} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-lg shadow-indigo-600/20">
                + {t.new_group}
              </button>
            </div>
            
            <div className="space-y-4">
              {state.circles.map(circle => (
                <div key={circle.id} className={`group relative w-full flex items-center gap-5 p-6 rounded-[32px] border-2 transition-all ${state.activeCircleId === circle.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl scale-[1.02]' : 'bg-slate-900 border-slate-800/40 opacity-80'}`}>
                  <button onClick={() => { setState(s => ({ ...s, activeCircleId: circle.id })); setActiveTab('radar'); }} className="flex-1 flex items-center gap-5 text-left">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-800 text-${circle.color}-400 shadow-inner border border-slate-700`}>
                      <i className={`fas ${circle.icon} text-xl`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{circle.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t.members_count(circle.members.length + 1)}</p>
                    </div>
                  </button>
                  <button onClick={() => setEditingCircle(circle)} className="p-3 text-slate-600 hover:text-white">
                    <i className="fas fa-ellipsis-vertical"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="h-full flex flex-col items-center animate-in zoom-in-95 pt-4">
            {!activeCircle.activeMeetingPoint ? (
              <div className="w-full py-10 space-y-6">
                <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[48px] space-y-6 shadow-2xl">
                  <h3 className="text-xl font-black text-center">{t.radar_off}</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder={t.place_search_placeholder}
                        value={placeSearch}
                        onChange={(e) => setPlaceSearch(e.target.value)}
                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button onClick={handleSearchPlace} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 p-2">
                        {isSearchingPlace ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                      </button>
                    </div>
                    
                    <button onClick={() => state.currentUser.location && handleSetMeetingPoint(state.currentUser.location, 'My Location')} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                      <i className="fas fa-location-crosshairs"></i> {t.mark_local_now}
                    </button>

                    <button onClick={() => setIsPickingOnMap(true)} className="w-full py-5 bg-slate-800 text-indigo-400 rounded-2xl font-black uppercase text-xs tracking-widest border border-indigo-500/20 flex items-center justify-center gap-3">
                      <i className="fas fa-map-marked-alt"></i> {t.pick_on_map}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-full flex justify-end mb-4">
                   <button 
                     onClick={() => setState(s => ({ ...s, viewMode: s.viewMode === 'radar' ? 'map' : 'radar' }))}
                     className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-indigo-400"
                   >
                     {state.viewMode === 'radar' ? <><i className="fas fa-map mr-2"></i> {t.map_view}</> : <><i className="fas fa-bullseye mr-2"></i> Radar</>}
                   </button>
                </div>

                <Radar 
                  meetingPoint={activeCircle.activeMeetingPoint} 
                  members={activeCircle.members} 
                  currentUser={state.currentUser} 
                  viewMode={state.viewMode} 
                  onMemberClick={(u) => setState(s => ({ ...s, selectedUserForChat: u }))} 
                />

                <div className="mt-12 w-full grid grid-cols-2 gap-4">
                  <button onClick={shareGroup} className="py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-[10px] font-black uppercase text-indigo-400 flex items-center justify-center gap-2 shadow-lg"><i className="fas fa-link"></i> {t.share}</button>
                  <button onClick={() => setState(prev => ({ ...prev, circles: prev.circles.map(c => c.id === state.activeCircleId ? { ...c, activeMeetingPoint: null } : c) }))} className="py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-[10px] font-black uppercase text-rose-500 flex items-center justify-center gap-2 shadow-lg"><i className="fas fa-stop"></i> {t.finish}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in slide-in-from-top-4 pb-10">
             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.profile_name}</h2>
                <input type="text" value={state.currentUser.name} onChange={(e) => setState(s => ({ ...s, currentUser: { ...s.currentUser, name: e.target.value } }))} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:border-indigo-500 shadow-xl" />
             </div>

             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.choose_avatar}</h2>
                <div className="grid grid-cols-3 gap-6">
                  {PRESET_AVATARS.map(avatar => (
                    <button key={avatar} onClick={() => setState(s => ({ ...s, currentUser: { ...s.currentUser, avatar } }))} className={`relative aspect-square rounded-3xl overflow-hidden border-4 transition-all ${state.currentUser.avatar === avatar ? 'border-indigo-500 scale-110 shadow-xl' : 'border-slate-800 bg-slate-900'}`}>
                      <img src={avatar} className="w-full h-full object-cover p-1" alt="" />
                    </button>
                  ))}
                </div>
             </div>

             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.language_select}</h2>
                <div className="flex gap-4">
                   <button onClick={() => setState(s => ({ ...s, language: 'en' }))} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase border-2 ${state.language === 'en' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'}`}>English</button>
                   <button onClick={() => setState(s => ({ ...s, language: 'pt' }))} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase border-2 ${state.language === 'pt' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'}`}>Português</button>
                </div>
             </div>
             
             <div className="space-y-4 pt-6">
                <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-xs font-black uppercase text-indigo-400">{t.reload}</button>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-rose-600/5 border-2 border-rose-500/20 rounded-2xl text-xs font-black uppercase text-rose-500">{t.clear_data}</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 z-[100] max-w-md mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[36px] flex justify-around shadow-2xl">
          {[
            { id: 'circles', icon: 'fa-layer-group', label: t.groups },
            { id: 'radar', icon: 'fa-bullseye', label: t.radar },
            { id: 'history', icon: 'fa-church', label: t.community }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center px-6 py-3 rounded-3xl transition-all ${activeTab === tab.id ? 'text-white bg-indigo-600 shadow-xl' : 'text-slate-500'}`}>
              <i className={`fas ${tab.icon} text-lg mb-1`}></i>
              <span className="text-[8px] font-black uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {editingCircle && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl p-8 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 rounded-[48px] border-2 border-slate-800 p-8 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black tracking-tight">{editingCircle.name ? t.edit_group : t.new_group}</h2>
            <div className="space-y-4">
              <input type="text" placeholder={t.groups} value={editingCircle.name} onChange={(e) => setEditingCircle({ ...editingCircle, name: e.target.value })} className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:border-indigo-500" />
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setEditingCircle({ ...editingCircle, color: c })} className={`w-10 h-10 rounded-full bg-${c}-600 border-4 transition-all ${editingCircle.color === c ? 'border-white scale-110' : 'border-transparent opacity-60'}`} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <button onClick={() => {
                setState(prev => {
                  const exists = prev.circles.find(c => c.id === editingCircle.id);
                  const newCircles = exists 
                    ? prev.circles.map(c => c.id === editingCircle.id ? editingCircle : c)
                    : [...prev.circles, editingCircle];
                  return { ...prev, circles: newCircles, activeCircleId: editingCircle.id };
                });
                setEditingCircle(null);
              }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">{t.save}</button>
              <button onClick={() => setEditingCircle(null)} className="w-full py-5 bg-transparent text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {isPickingOnMap && (
        <LocationPicker 
          onConfirm={(coords) => handleSetMeetingPoint(coords, 'Selected Point')} 
          onCancel={() => setIsPickingOnMap(false)} 
          language={state.language}
          initialCoords={state.currentUser.location}
        />
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
