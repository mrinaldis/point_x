
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
  const maxDistance = 1.0; // LIMITE DE 1 MILHA

  const nearbyMembers = useMemo(() => {
    return members.filter(m => {
      if (!m.location) return false;
      const dist = calculateDistance(
        meetingPoint.coordinates.latitude,
        meetingPoint.coordinates.longitude,
        m.location.latitude,
        m.location.longitude
      );
      return dist <= maxDistance; // SÓ APARECE SE ESTIVER A MENOS DE 1 MILHA
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
    <div className="relative p-4">
      <div className="relative rounded-full border-2 border-indigo-500/20 bg-slate-900/50 overflow-hidden shadow-2xl" style={{ width: radarSize, height: radarSize }}>
        {/* Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-3/4 rounded-full border border-indigo-500/5"></div>
          <div className="w-1/2 h-1/2 rounded-full border border-indigo-500/10"></div>
          <div className="w-1/4 h-1/4 rounded-full border border-indigo-500/15"></div>
          <div className="absolute inset-0 animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_340deg,rgba(99,102,241,0.1)_360deg)]"></div>
        </div>

        {/* Center Point */}
        <div className="absolute z-20 w-8 h-8 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg" style={{ top: center - 16, left: center - 16 }}>
          <i className="fas fa-location-dot text-[10px] text-white"></i>
        </div>

        {/* Users */}
        {nearbyMembers.map((member) => {
          if (!member.location) return null;
          const { x, y } = getPosition(member.location);
          const dist = calculateDistance(meetingPoint.coordinates.latitude, meetingPoint.coordinates.longitude, member.location.latitude, member.location.longitude);
          const isArrived = dist < 0.05;

          return (
            <button 
              key={member.id} 
              onClick={() => onMemberClick(member)}
              className="absolute z-30 transition-all duration-1000 transform hover:scale-125"
              style={{ top: y - 14, left: x - 14 }}
            >
              <img src={member.avatar} className={`w-7 h-7 rounded-full border-2 ${isArrived ? 'border-emerald-500' : 'border-indigo-400'}`} alt={member.name} />
              <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${isArrived ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex justify-center gap-6 text-[8px] font-black uppercase text-slate-500 tracking-tighter">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Ponto</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> No Radar (&lt;1mi)</div>
      </div>
    </div>
  );
};

export default Radar;
