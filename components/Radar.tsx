
import React, { useMemo } from 'react';
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
  const radarSize = 320;
  const center = radarSize / 2;
  const maxDistance = 1.0; // 1 milha

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

  return (
    <div className="flex flex-col items-center">
      <div className="relative group p-4">
        {/* Glow de Fundo Profundo */}
        <div className="absolute -inset-10 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative rounded-full border-2 border-indigo-500/10 bg-slate-900 shadow-[0_0_80px_-20px_rgba(79,70,229,0.2)]" style={{ width: radarSize, height: radarSize }}>
          
          {/* Círculo Pulsante de Alcance */}
          <div className="absolute inset-4 border border-indigo-500/10 rounded-full radar-pulse"></div>
          
          {/* Linhas de Grade Estilizadas */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent"></div>
          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent"></div>

          {/* Anéis de Referência */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[80%] rounded-full border border-indigo-500/5"></div>
            <div className="w-[50%] h-[50%] rounded-full border border-indigo-500/5"></div>
            <div className="w-[20%] h-[20%] rounded-full border border-indigo-500/10"></div>
          </div>

          {/* Ponto Central (O Encontro) */}
          <div className="absolute z-20 w-12 h-12 bg-indigo-600 rounded-2xl border-4 border-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] transform -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ top: '50%', left: '50%' }}>
            <i className="fas fa-location-dot text-white text-base -rotate-45"></i>
          </div>

          {/* Membros no Radar */}
          {nearbyMembers.map((member) => {
            if (!member.location) return null;
            const { x, y } = getPosition(member.location);
            const dist = calculateDistance(meetingPoint.coordinates.latitude, meetingPoint.coordinates.longitude, member.location.latitude, member.location.longitude);
            const isArrived = dist < 0.03; // Menos de 50 metros

            return (
              <button 
                key={member.id} 
                onClick={() => onMemberClick(member)}
                className="absolute z-30 transition-all duration-1000 hover:scale-125 focus:outline-none"
                style={{ top: y - 20, left: x - 20 }}
              >
                <div className="relative group/member">
                  {/* Brilho ao redor do avatar */}
                  <div className={`absolute -inset-1.5 rounded-full blur-sm opacity-60 animate-pulse ${isArrived ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
                  
                  <div className={`relative w-10 h-10 rounded-full border-2 overflow-hidden shadow-xl bg-slate-800 transition-all ${isArrived ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-indigo-400 ring-4 ring-indigo-400/10'}`}>
                    <img src={member.avatar} className="w-full h-full object-cover" alt={member.name} />
                  </div>

                  {isArrived && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full w-4 h-4 border-2 border-slate-950 flex items-center justify-center shadow-lg">
                      <i className="fas fa-check text-[7px] text-white"></i>
                    </div>
                  )}

                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg shadow-xl">
                    <p className="text-[8px] font-black uppercase text-white whitespace-nowrap tracking-wider">{member.name.split(' ')[0]}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Legenda Estilizada */}
      <div className="mt-14 flex gap-6 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-900/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div> PONTO</div>
        <div className="flex items-center gap-2 text-indigo-400"><div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div> NO RADAR</div>
        <div className="flex items-center gap-2 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> CHEGOU</div>
      </div>
    </div>
  );
};

export default Radar;
