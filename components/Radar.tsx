
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
  const radarSize = 300;
  const center = radarSize / 2;
  const maxDistance = 1.0; // LIMITE DE 1 MILHA (APROX. 1.6KM)

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
    
    // Escala para caber no círculo do radar
    const r = (dist / maxDistance) * (radarSize / 2);
    const x = center + r * Math.sin(angle);
    const y = center - r * Math.cos(angle);

    return { x, y };
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Background Glow */}
        <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative rounded-full border-2 border-indigo-500/20 bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)]" style={{ width: radarSize, height: radarSize }}>
          
          {/* Círculo da Milha de Segurança */}
          <div className="absolute inset-0 border border-indigo-500/10 rounded-full radar-pulse"></div>
          
          {/* Linhas de Grade */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-indigo-500/5"></div>
          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-indigo-500/5"></div>

          {/* Anéis Internos */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 h-2/3 rounded-full border border-indigo-500/5"></div>
            <div className="w-1/3 h-1/3 rounded-full border border-indigo-500/10"></div>
          </div>

          {/* Ponto Central (O Encontro) */}
          <div className="absolute z-20 w-10 h-10 bg-indigo-600 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-xl transform -translate-x-1/2 -translate-y-1/2" style={{ top: '50%', left: '50%' }}>
            <i className="fas fa-location-dot text-white text-xs"></i>
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
                className="absolute z-30 transition-all duration-700 hover:scale-125 focus:outline-none"
                style={{ top: y - 16, left: x - 16 }}
              >
                <div className="relative">
                  <img src={member.avatar} className={`w-8 h-8 rounded-full border-2 shadow-lg ${isArrived ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-indigo-400 ring-2 ring-indigo-400/20'}`} alt={member.name} />
                  {isArrived && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full w-3 h-3 border-2 border-slate-900 flex items-center justify-center">
                      <i className="fas fa-check text-[5px] text-white"></i>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 px-1.5 py-0.5 rounded text-[7px] font-black whitespace-nowrap border border-slate-800 uppercase tracking-tighter">
                  {member.name.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Legenda */}
      <div className="mt-12 flex gap-4 text-[9px] font-black uppercase text-slate-500 tracking-widest bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Ponto</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> No Radar</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Chegou</div>
      </div>
    </div>
  );
};

export default Radar;
