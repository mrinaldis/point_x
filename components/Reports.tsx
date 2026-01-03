
import React from 'react';
import { User, MeetingPoint, Language } from '../types';

interface ReportsProps {
  meetingPoint: MeetingPoint;
  members: User[];
  onClose: () => void;
  language: Language;
}

const Reports: React.FC<ReportsProps> = ({ meetingPoint, members, onClose, language }) => {
  const t = {
    en: {
      title: 'Activity Report',
      confirmed: 'Confirmed',
      arrived: 'Arrived',
      time: 'Arrival Time',
      status: 'Status',
      close: 'Close',
      attendance_rate: 'Attendance Rate',
      awaiting: 'Awaiting...'
    },
    pt: {
      title: 'Relatório de Atividade',
      confirmed: 'Confirmados',
      arrived: 'Presença Real',
      time: 'Hora de Chegada',
      status: 'Status',
      close: 'Fechar',
      attendance_rate: 'Taxa de Comparecimento',
      awaiting: 'Aguardando...'
    }
  }[language];

  const confirmedCount = meetingPoint.confirmedMembers?.length || 0;
  const arrivedCount = members.filter(m => m.status === 'arrived').length;
  const rate = confirmedCount > 0 ? Math.round((arrivedCount / confirmedCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{t.title}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase">{meetingPoint.title}</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-slate-400">
          <i className="fas fa-times"></i>
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-3xl text-center">
           <div className="text-[10px] font-black uppercase text-indigo-400 mb-1">{t.confirmed}</div>
           <div className="text-3xl font-black">{confirmedCount}</div>
        </div>
        <div className="bg-emerald-600/10 border border-emerald-500/20 p-5 rounded-3xl text-center">
           <div className="text-[10px] font-black uppercase text-emerald-400 mb-1">{t.arrived}</div>
           <div className="text-3xl font-black">{arrivedCount}</div>
        </div>
      </div>

      <div className="mb-8">
         <div className="flex justify-between text-[10px] font-black uppercase mb-2">
            <span>{t.attendance_rate}</span>
            <span className="text-indigo-400">{rate}%</span>
         </div>
         <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-1000" style={{ width: `${rate}%` }}></div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {members.map(member => {
          const isConfirmed = meetingPoint.confirmedMembers?.includes(member.id);
          const hasArrived = member.status === 'arrived';
          
          return (
            <div key={member.id} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={member.avatar} className="w-8 h-8 rounded-full border border-slate-700" alt="" />
                <div>
                  <h4 className="text-sm font-bold">{member.name}</h4>
                  <div className="flex gap-2">
                    {isConfirmed && <span className="text-[8px] font-black uppercase text-indigo-400">{t.confirmed}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-black uppercase ${hasArrived ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {hasArrived ? t.arrived : t.awaiting}
                </div>
                {member.arrivalTime && (
                  <div className="text-[9px] text-slate-500">
                    {new Date(member.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onClose} className="mt-6 w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl">
        {t.close}
      </button>
    </div>
  );
};

export default Reports;
