
import React, { useMemo, useEffect, useRef } from 'react';
import { User, MeetingPoint, Coordinates, ViewMode } from '../types';
import { calculateDistance } from '../utils/geo';

interface RadarProps {
  meetingPoint: MeetingPoint;
  members: User[];
  currentUser: User;
  viewMode: ViewMode;
  onMemberClick: (user: User) => void;
}

const Radar: React.FC<RadarProps> = ({ meetingPoint, members, currentUser, viewMode, onMemberClick }) => {
  // Fix: changed L.Map to any because Leaflet types are not globally available and L is accessed via window
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const radarSize = 320;
  const center = radarSize / 2;
  const maxDistance = 1.0; // 1 milha

  // Lógica do Radar SVG
  const nearbyMembers = useMemo(() => {
    return members.filter(m => {
      if (!m.location) return false;
      const dist = calculateDistance(
        meetingPoint.coordinates.latitude,
        meetingPoint.coordinates.longitude,
        m.location.latitude,
        m.location.longitude
      );
      return dist <= maxDistance; 
    });
  }, [members, meetingPoint]);

  const getPosition = (target: Coordinates) => {
    const lat1 = meetingPoint.coordinates.latitude;
    const lon1 = meetingPoint.coordinates.longitude;
    const lat2 = target.latitude;
    const lon2 = target.longitude;
    const dLat = lat2 - lat1;
    const dLon = (lon2 - lon1) * Math.cos(lat1 * Math.PI / 180);
    const dist = calculateDistance(lat1, lon1, lat2, lon2);
    const angle = Math.atan2(dLon, dLat);
    const r = (dist / maxDistance) * (radarSize / 2);
    const x = center + r * Math.sin(angle);
    const y = center - r * Math.cos(angle);
    return { x, y };
  };

  // Lógica do Mapa Leaflet
  useEffect(() => {
    if (viewMode === 'map' && mapContainerRef.current && !mapRef.current) {
      const L = (window as any).L;
      if (!L) return;

      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([meetingPoint.coordinates.latitude, meetingPoint.coordinates.longitude], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);

      // Ícone do Ponto de Encontro
      const meetingIcon = L.divIcon({
        className: 'custom-meeting-icon',
        html: `<div style="background:#4f46e5; width:20px; height:20px; border-radius:5px; transform:rotate(45deg); border:2px solid white; display:flex; align-items:center; justify-content:center;"><i class="fas fa-location-dot" style="color:white; font-size:10px; transform:rotate(-45deg);"></i></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([meetingPoint.coordinates.latitude, meetingPoint.coordinates.longitude], { icon: meetingIcon }).addTo(mapRef.current);

      // Renderizar membros no mapa
      members.forEach(m => {
        if (m.location) {
          const memberIcon = L.divIcon({
            className: 'custom-member-icon',
            html: `<div style="position:relative;"><div style="width:30px; height:30px; border-radius:50%; border:2px solid #4f46e5; overflow:hidden; background:#0f172a;"><img src="${m.avatar}" style="width:100%; height:100%; object-fit:cover;"></div></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          L.marker([m.location.latitude, m.location.longitude], { icon: memberIcon }).addTo(mapRef.current!).on('click', () => onMemberClick(m));
        }
      });

      // Usuário atual
      if (currentUser.location) {
        L.circle([currentUser.location.latitude, currentUser.location.longitude], {
          radius: 50,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.2
        }).addTo(mapRef.current);
      }
    }

    return () => {
      if (viewMode !== 'map' && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [viewMode, meetingPoint, members, currentUser]);

  return (
    <div className="flex flex-col items-center w-full">
      {viewMode === 'radar' ? (
        <div className="relative group p-4">
          <div className="absolute -inset-10 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative rounded-full border-2 border-indigo-500/10 bg-slate-900 shadow-2xl" style={{ width: radarSize, height: radarSize }}>
            <div className="absolute inset-4 border border-indigo-500/10 rounded-full radar-pulse"></div>
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent"></div>
            <div className="absolute left-1/2 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent"></div>
            <div className="absolute z-20 w-12 h-12 bg-indigo-600 rounded-2xl border-4 border-slate-950 flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ top: '50%', left: '50%' }}>
              <i className="fas fa-location-dot text-white text-base -rotate-45"></i>
            </div>
            {nearbyMembers.map((member) => {
              if (!member.location) return null;
              const { x, y } = getPosition(member.location);
              const dist = calculateDistance(meetingPoint.coordinates.latitude, meetingPoint.coordinates.longitude, member.location.latitude, member.location.longitude);
              const isArrived = dist < 0.03;
              return (
                <button 
                  key={member.id} 
                  onClick={() => onMemberClick(member)}
                  className="absolute z-30 transition-all duration-1000"
                  style={{ top: y - 20, left: x - 20 }}
                >
                  <div className="relative">
                    <div className={`absolute -inset-1.5 rounded-full blur-sm opacity-60 animate-pulse ${isArrived ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
                    <div className={`relative w-10 h-10 rounded-full border-2 overflow-hidden bg-slate-800 ${isArrived ? 'border-emerald-500' : 'border-indigo-400'}`}>
                      <img src={member.avatar} className="w-full h-full object-cover" alt={member.name} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-[320px] rounded-[40px] border-2 border-slate-800 shadow-2xl overflow-hidden"></div>
      )}
      
      <div className="mt-14 flex gap-6 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-900/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> PONTO</div>
        <div className="flex items-center gap-2 text-indigo-400"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> RADAR</div>
        <div className="flex items-center gap-2 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> CHEGOU</div>
      </div>
    </div>
  );
};

export default Radar;
