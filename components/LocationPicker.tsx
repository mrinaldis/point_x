
import React, { useEffect, useRef, useState } from 'react';
import { Coordinates, Language } from '../types';
import { resolveLocation } from '../services/geminiService';

interface LocationPickerProps {
  onConfirm: (coords: Coordinates) => void;
  onCancel: () => void;
  language: Language;
  initialCoords?: Coordinates;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onConfirm, onCancel, language, initialCoords }) => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [currentPos, setCurrentPos] = useState<Coordinates>(initialCoords || { latitude: -23.5617, longitude: -46.6560 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const t = {
    en: { confirm: 'Pin Location', cancel: 'Cancel', search: 'Search address...', my_loc: 'Locate Me' },
    pt: { confirm: 'Fixar Local', cancel: 'Cancelar', search: 'Buscar endereço...', my_loc: 'Meu Local' }
  }[language];

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
      inertia: true
    }).setView([currentPos.latitude, currentPos.longitude], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapRef.current);

    mapRef.current.on('move', () => {
      const center = mapRef.current.getCenter();
      setCurrentPos({ latitude: center.lat, longitude: center.lng });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const resolved = await resolveLocation(searchQuery);
    setIsSearching(false);
    if (resolved && mapRef.current) {
      mapRef.current.flyTo([resolved.latitude, resolved.longitude], 17, { duration: 1.5 });
      setCurrentPos(resolved);
    }
  };

  const handleGoToMyLocation = () => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        mapRef.current.flyTo([coords.latitude, coords.longitude], 17, { duration: 1.2 });
        setCurrentPos(coords);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      {/* Search Header */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5 space-y-3">
        <div className="flex justify-between items-center mb-1">
          <button onClick={onCancel} className="text-slate-400 p-2 -ml-2"><i className="fas fa-arrow-left text-xl"></i></button>
          <h2 className="font-black uppercase text-[10px] tracking-widest text-indigo-400">{t.confirm}</h2>
          <div className="w-10"></div>
        </div>
        <div className="relative group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t.search} 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm focus:border-indigo-500 transition-all outline-none pr-12 shadow-lg"
          />
          <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 w-10 h-10 flex items-center justify-center bg-indigo-500/10 rounded-xl">
            {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
          </button>
        </div>
      </div>

      <div ref={mapContainerRef} className="flex-1 relative bg-slate-900">
        {/* Visual Target Marker (Static in center) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1100]">
          <div className="relative flex flex-col items-center">
             <div className="mb-8 flex flex-col items-center animate-bounce-slow">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-slate-950 shadow-2xl picker-target">
                   <i className="fas fa-location-dot text-white text-xl"></i>
                </div>
                <div className="w-1 h-8 bg-gradient-to-b from-indigo-600 to-transparent"></div>
             </div>
             {/* Small dot exactly at the center */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-indigo-600 shadow-lg"></div>
          </div>
        </div>

        {/* Locate Me Button Overlay */}
        <button 
          onClick={handleGoToMyLocation}
          className="absolute bottom-6 right-6 z-[1100] w-14 h-14 bg-slate-900 border-2 border-slate-800 rounded-2xl flex items-center justify-center text-indigo-400 shadow-2xl active:scale-90 transition-all"
        >
          <i className="fas fa-location-crosshairs text-xl"></i>
        </button>
      </div>

      <div className="p-8 bg-slate-950/90 backdrop-blur-xl border-t border-white/5">
        <button 
          onClick={() => onConfirm(currentPos)}
          className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all"
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
