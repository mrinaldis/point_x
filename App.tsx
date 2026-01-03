
import React, { useState, useEffect, useMemo } from 'react';
import { User, MeetingPoint, AppState, Coordinates, FriendCircle, SubsplashEvent, Language } from './types';
import { calculateDistance } from './utils/geo';
import { fetchSubsplashEvents, resolveLocation } from './services/geminiService';
import Radar from './components/Radar';
import ChatOverlay from './components/ChatOverlay';
import LocationPicker from './components/LocationPicker';
import Reports from './components/Reports';

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
    reports: 'Reports',
    radar_off: 'Radar Idle',
    mark_local_now: 'Mark My Location',
    mark_custom_place: 'Search Place',
    pick_on_map: 'Pick on Map',
    create_event: 'Schedule Event',
    event_title: 'Event Title',
    event_datetime: 'Date and Time',
    gps_error: 'GPS disabled. Please enable to use the radar.',
    place_search_placeholder: 'Search for a place...',
    community_search_placeholder: 'Community Name...',
    fetch_events: 'Search Events',
    no_events: 'No events found.',
    mark_from_event: 'Mark Event',
    confirm_going: 'I am Going',
    going: 'Confirmed',
    profile_name: 'Your Name',
    choose_avatar: 'Choose Persona',
    language_select: 'Language',
    finish: 'Finish',
    members_count: (n: number) => `${n} members`,
    invite_msg: (groupName: string) => `Join my group "${groupName}" on PointX!`,
    reload: 'Reload',
    clear_data: 'Reset App',
    map_view: 'Map View',
    confirm_location: 'Confirm Location',
    arrived: 'Arrived',
    not_arrived: 'Awaiting',
    open_external: 'External Maps'
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
    reports: 'Relatórios',
    radar_off: 'Radar Inativo',
    mark_local_now: 'Marcar Meu Local',
    mark_custom_place: 'Buscar Lugar',
    pick_on_map: 'Escolher no Mapa',
    create_event: 'Agendar Evento',
    event_title: 'Título do Evento',
    event_datetime: 'Data e Hora',
    gps_error: 'GPS desativado. Ative para usar o radar.',
    place_search_placeholder: 'Buscar um lugar...',
    community_search_placeholder: 'Nome da Comunidade...',
    fetch_events: 'Buscar Eventos',
    no_events: 'Nenhum evento encontrado.',
    mark_from_event: 'Marcar Evento',
    confirm_going: 'Eu Vou',
    going: 'Confirmado',
    profile_name: 'Seu Nome',
    choose_avatar: 'Escolha seu Persona',
    language_select: 'Idioma',
    finish: 'Encerrar',
    members_count: (n: number) => `${n} membros`,
    invite_msg: (groupName: string) => `Entre no meu grupo "${groupName}" no PointX!`,
    reload: 'Recarregar',
    clear_data: 'Limpar Tudo',
    map_view: 'Ver Mapa',
    confirm_location: 'Confirmar Local',
    arrived: 'Chegou',
    not_arrived: 'A caminho',
    open_external: 'Ver no Maps'
  }
};

const INITIAL_CIRCLES: FriendCircle[] = [
  { 
    id: 'c1', 
    name: 'Main Group', 
    icon: 'fa-users', 
    color: 'indigo', 
    activeMeetingPoint: null, 
    members: [
      { id: 'm1', name: 'James', avatar: PRESET_AVATARS[2], isNearby: true, status: 'active', location: { latitude: -23.560, longitude: -46.655 } },
      { id: 'm2', name: 'Sara', avatar: PRESET_AVATARS[3], isNearby: false, status: 'active', location: { latitude: -23.565, longitude: -46.650 } }
    ] 
  },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedCircles = JSON.parse(localStorage.getItem('pointx_circles_v5') || 'null');
    const savedUser = JSON.parse(localStorage.getItem('pointx_user_v5') || 'null');
    const savedLang = (localStorage.getItem('pointx_lang_v5') as Language) || 'en';
    
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
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: null as Coordinates | null });
  const [communitySearch, setCommunitySearch] = useState('');
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const t = TRANSLATIONS[state.language];
  const activeCircle = useMemo(() => state.circles.find(c => c.id === state.activeCircleId) || state.circles[0], [state.circles, state.activeCircleId]);

  useEffect(() => {
    localStorage.setItem('pointx_circles_v5', JSON.stringify(state.circles));
    localStorage.setItem('pointx_user_v5', JSON.stringify(state.currentUser));
    localStorage.setItem('pointx_lang_v5', state.language);
  }, [state.circles, state.currentUser, state.language]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setState(prev => {
            const circle = prev.circles.find(c => c.id === prev.activeCircleId);
            let arrivedStatus = prev.currentUser.status;
            let arrivalTime = prev.currentUser.arrivalTime;

            if (circle?.activeMeetingPoint) {
              const dist = calculateDistance(
                circle.activeMeetingPoint.coordinates.latitude,
                circle.activeMeetingPoint.coordinates.longitude,
                newLoc.latitude,
                newLoc.longitude
              );
              if (dist < 0.03 && arrivedStatus !== 'arrived') {
                arrivedStatus = 'arrived';
                arrivalTime = Date.now();
              }
            }

            return { 
              ...prev, 
              currentUser: { 
                ...prev.currentUser, 
                location: newLoc, 
                status: arrivedStatus as any,
                arrivalTime: arrivalTime 
              },
              isTracking: true,
              error: null 
            };
          });
        },
        (err) => setState(prev => ({ ...prev, error: t.gps_error })),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [state.language, state.activeCircleId]);

  const handleSetMeetingPoint = (coords: Coordinates, title: string, fromEvent?: Partial<SubsplashEvent>) => {
    const point: MeetingPoint = {
      id: fromEvent?.id || 'p-' + Date.now(),
      title: title || 'Meeting Point',
      description: fromEvent?.description || 'Meeting organized via PointX',
      date: fromEvent?.date || new Date().toISOString(),
      locationName: title || 'Meeting Point',
      address: fromEvent?.address || '',
      coordinates: coords,
      radius: 1.0,
      confirmedMembers: [state.currentUser.id]
    };
    
    setState(prev => ({
      ...prev,
      circles: prev.circles.map(c => c.id === prev.activeCircleId ? { ...c, activeMeetingPoint: point } : c)
    }));
    setIsPickingOnMap(false);
    setIsCreatingEvent(false);
    setActiveTab('radar');
  };

  const handleCreateEventSubmit = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.location) {
      alert("Please fill all fields and pick a location on the map.");
      return;
    }
    handleSetMeetingPoint(newEvent.location, newEvent.title, { date: newEvent.date });
  };

  const handleFetchCommunityEvents = async () => {
    if (!communitySearch) return;
    setIsSearchingCommunity(true);
    const events = await fetchSubsplashEvents(communitySearch);
    setState(prev => ({ ...prev, subsplashEvents: events }));
    setIsSearchingCommunity(false);
  };

  const toggleConfirmGoing = (eventId: string) => {
    setState(prev => {
      const circle = prev.circles.find(c => c.id === prev.activeCircleId);
      if (!circle?.activeMeetingPoint || circle.activeMeetingPoint.id !== eventId) return prev;
      
      const isConfirmed = circle.activeMeetingPoint.confirmedMembers?.includes(prev.currentUser.id);
      const newConfirmed = isConfirmed 
        ? circle.activeMeetingPoint.confirmedMembers?.filter(id => id !== prev.currentUser.id)
        : [...(circle.activeMeetingPoint.confirmedMembers || []), prev.currentUser.id];

      return {
        ...prev,
        circles: prev.circles.map(c => c.id === prev.activeCircleId ? {
          ...c,
          activeMeetingPoint: { ...c.activeMeetingPoint!, confirmedMembers: newConfirmed }
        } : c)
      };
    });
  };

  const openInExternalMaps = () => {
    if (activeCircle.activeMeetingPoint) {
      const { latitude, longitude } = activeCircle.activeMeetingPoint.coordinates;
      window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans pb-32">
      {state.error && (
        <div className="fixed top-0 left-0 right-0 z-[400] bg-rose-600 text-[10px] font-black uppercase text-center py-2 shadow-lg">
          {state.error}
        </div>
      )}

      <header className="p-6 pt-10 flex items-center justify-between">
        <div className="relative">
          <div className="absolute -inset-2 bg-indigo-500/20 blur-xl rounded-full opacity-50"></div>
          <h1 className="relative text-3xl font-black tracking-tighter italic bg-gradient-to-br from-white to-indigo-400 bg-clip-text text-transparent">{t.app_name}</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{activeCircle.name}</p>
        </div>
        <button onClick={() => setActiveTab('settings')} className="w-12 h-12 rounded-2xl border-2 border-slate-800 flex items-center justify-center bg-slate-900 overflow-hidden shadow-lg">
          <img src={state.currentUser.avatar} className="w-full h-full p-1" alt="" />
        </button>
      </header>

      <main className="flex-1 px-6">
        {activeTab === 'circles' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.groups}</h2>
              <button onClick={() => setEditingCircle({ id: 'c' + Date.now(), name: '', icon: 'fa-users', color: 'indigo', members: [], activeMeetingPoint: null })} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase">+ {t.new_group}</button>
            </div>
            <div className="space-y-4">
              {state.circles.map(circle => (
                <div key={circle.id} className={`p-6 rounded-[32px] border-2 flex flex-col gap-4 transition-all ${state.activeCircleId === circle.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setState(s => ({ ...s, activeCircleId: circle.id })); setActiveTab('radar'); }} className="flex-1 flex items-center gap-4 text-left">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 text-${circle.color}-400 shadow-inner`}><i className={`fas ${circle.icon}`}></i></div>
                      <div><h3 className="font-bold">{circle.name}</h3><p className="text-[10px] text-slate-500">{t.members_count(circle.members.length + 1)}</p></div>
                    </button>
                    <button onClick={() => setEditingCircle(circle)} className="p-2 text-slate-600"><i className="fas fa-edit text-sm"></i></button>
                  </div>
                  {state.activeCircleId === circle.id && (
                    <button onClick={() => { setIsCreatingEvent(true); setNewEvent({ title: '', date: '', location: null }); }} className="w-full py-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-[11px] font-black uppercase text-indigo-400 hover:bg-indigo-600/30 transition-all flex items-center justify-center gap-2">
                      <i className="fas fa-calendar-plus"></i> {t.create_event}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="h-full flex flex-col items-center animate-in zoom-in-95 pt-4">
            {!activeCircle.activeMeetingPoint ? (
              <div className="w-full py-6 space-y-6">
                 <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[40px] space-y-6">
                    <h3 className="text-xl font-black text-center">{t.radar_off}</h3>
                    <div className="space-y-3">
                       <button onClick={() => state.currentUser.location && handleSetMeetingPoint(state.currentUser.location, 'Meeting Point')} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-600/20"><i className="fas fa-location-crosshairs mr-2"></i> {t.mark_local_now}</button>
                       <button onClick={() => setIsPickingOnMap(true)} className="w-full py-4 bg-slate-800 border-2 border-slate-700 rounded-2xl font-black uppercase text-xs text-indigo-400"><i className="fas fa-map mr-2"></i> {t.pick_on_map}</button>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                 <div className="flex justify-between items-center mb-2">
                    <button onClick={() => setShowReports(true)} className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-amber-400 flex items-center gap-2"><i className="fas fa-chart-pie"></i> {t.reports}</button>
                    <div className="flex gap-2">
                      <button onClick={openInExternalMaps} className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-indigo-400 flex items-center gap-2"><i className="fas fa-directions"></i> {t.open_external}</button>
                      <button onClick={() => setState(s => ({ ...s, viewMode: s.viewMode === 'radar' ? 'map' : 'radar' }))} className="px-4 py-2.5 bg-indigo-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-600/20">{state.viewMode === 'radar' ? t.map_view : 'Radar'}</button>
                    </div>
                 </div>

                 <Radar 
                    meetingPoint={activeCircle.activeMeetingPoint} 
                    members={activeCircle.members} 
                    currentUser={state.currentUser} 
                    viewMode={state.viewMode} 
                    onMemberClick={(u) => setState(s => ({ ...s, selectedUserForChat: u }))} 
                 />

                 <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={() => toggleConfirmGoing(activeCircle.activeMeetingPoint!.id)} className={`py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border-2 transition-all ${activeCircle.activeMeetingPoint.confirmedMembers?.includes(state.currentUser.id) ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                       <i className={`fas ${activeCircle.activeMeetingPoint.confirmedMembers?.includes(state.currentUser.id) ? 'fa-check-circle' : 'fa-circle-question'}`}></i> {activeCircle.activeMeetingPoint.confirmedMembers?.includes(state.currentUser.id) ? t.going : t.confirm_going}
                    </button>
                    <button onClick={() => setState(prev => ({ ...prev, circles: prev.circles.map(c => c.id === state.activeCircleId ? { ...c, activeMeetingPoint: null } : c) }))} className="py-4 bg-rose-600/10 border-2 border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase">{t.finish}</button>
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">{t.community}</h2>
             <div className="relative">
                <input type="text" value={communitySearch} onChange={(e) => setCommunitySearch(e.target.value)} placeholder={t.community_search_placeholder} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500" />
                <button onClick={handleFetchCommunityEvents} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400">
                   {isSearchingCommunity ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                </button>
             </div>
             <div className="space-y-4 pb-10">
                {state.subsplashEvents.map(event => (
                   <div key={event.id} className="bg-slate-900 border-2 border-slate-800 p-6 rounded-[32px] space-y-4">
                      <div>
                         <h4 className="font-bold text-lg">{event.title}</h4>
                         <p className="text-xs text-indigo-400">{new Date(event.date).toLocaleDateString()}</p>
                         <p className="text-xs text-slate-500 mt-2">{event.description}</p>
                      </div>
                      <button onClick={() => handleSetMeetingPoint(event.coordinates, event.title, event)} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{t.mark_from_event}</button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in slide-in-from-top-4">
             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.profile_name}</h2>
                <input type="text" value={state.currentUser.name} onChange={(e) => setState(s => ({ ...s, currentUser: { ...s.currentUser, name: e.target.value } }))} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-4 font-bold" />
             </div>
             <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.language_select}</h2>
                <div className="flex gap-3">
                   <button onClick={() => setState(s => ({ ...s, language: 'en' }))} className={`flex-1 py-4 rounded-2xl font-black text-xs border-2 ${state.language === 'en' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'}`}>ENGLISH</button>
                   <button onClick={() => setState(s => ({ ...s, language: 'pt' }))} className={`flex-1 py-4 rounded-2xl font-black text-xs border-2 ${state.language === 'pt' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'}`}>PORTUGUÊS</button>
                </div>
             </div>
             <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 text-rose-500 text-xs font-black uppercase border-2 border-rose-500/20 rounded-2xl">Reset App Data</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 z-[300] max-w-md mx-auto">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[36px] flex justify-around shadow-2xl">
          {[
            { id: 'circles', icon: 'fa-layer-group', label: t.groups },
            { id: 'radar', icon: 'fa-bullseye', label: t.radar },
            { id: 'history', icon: 'fa-users-between-lines', label: t.community }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center px-6 py-3 rounded-3xl transition-all ${activeTab === tab.id ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/30' : 'text-slate-500'}`}>
              <i className={`fas ${tab.icon} text-lg mb-1`}></i>
              <span className="text-[8px] font-black uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Create Event Modal */}
      {isCreatingEvent && (
        <div className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-xl p-8 flex items-center justify-center animate-in fade-in zoom-in-95">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-800 rounded-[48px] p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{t.create_event}</h2>
              <button onClick={() => setIsCreatingEvent(false)} className="p-2 text-slate-500"><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2">{t.event_title}</label>
                <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none" placeholder="Ex: Family Dinner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2">{t.event_datetime}</label>
                <input type="datetime-local" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Location</label>
                <button onClick={() => setIsPickingOnMap(true)} className={`w-full py-5 rounded-2xl border-2 flex items-center justify-center gap-3 font-black uppercase text-[11px] transition-all ${newEvent.location ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <i className={`fas ${newEvent.location ? 'fa-check-circle' : 'fa-map-pin'}`}></i>
                  {newEvent.location ? t.confirm_location : t.pick_on_map}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
              <button onClick={handleCreateEventSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Schedule Now</button>
              <button onClick={() => setIsCreatingEvent(false)} className="w-full py-4 text-slate-500 font-black uppercase text-[10px]">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {showReports && activeCircle.activeMeetingPoint && (
        <Reports 
          meetingPoint={activeCircle.activeMeetingPoint} 
          members={[state.currentUser, ...activeCircle.members]} 
          onClose={() => setShowReports(false)} 
          language={state.language}
        />
      )}

      {isPickingOnMap && (
        <LocationPicker 
          onConfirm={(coords) => {
            if (isCreatingEvent) {
              setNewEvent({ ...newEvent, location: coords });
              setIsPickingOnMap(false);
            } else {
              handleSetMeetingPoint(coords, 'Quick Meeting');
            }
          }} 
          onCancel={() => setIsPickingOnMap(false)} 
          language={state.language}
          initialCoords={state.currentUser.location}
        />
      )}

      {editingCircle && (
        <div className="fixed inset-0 z-[600] bg-slate-950/90 backdrop-blur-xl p-8 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 rounded-[48px] border-2 border-slate-800 p-8 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black tracking-tight italic">{editingCircle.name ? t.edit_group : t.new_group}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Group Name" value={editingCircle.name} onChange={(e) => setEditingCircle({ ...editingCircle, name: e.target.value })} className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:border-indigo-500" />
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
