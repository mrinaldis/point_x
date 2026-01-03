
import React, { useEffect, useRef, useState } from 'react';
import { Coordinates, Language } from '../types';

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

  const t = {
    en: { confirm: 'Confirm Location', cancel: 'Cancel' },
    pt: { confirm: 'Confirmar Local', cancel: 'Cancelar' }
  }[language];

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([currentPos.latitude, currentPos.longitude], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapRef.current);

    // Marker central fixo ou móvel? Vamos fazer o mapa seguir o centro e o marker ficar fixo no meio
    const centerMarker = L.divIcon({
      className: 'picker-center-icon',
      html: `<div style="color: #4f46e5; font-size: 32px; transform: translate(-50%, -100%); position: absolute; top: 0; left: 0;"><i class="fas fa-location-dot shadow-2xl"></i></div>`,
      iconSize: [0, 0]
    });

    const marker = L.marker(mapRef.current.getCenter(), { icon: centerMarker, interactive: false }).addTo(mapRef.current);

    mapRef.current.on('move', () => {
      const center = mapRef.current.getCenter();
      marker.setLatLng(center);
      setCurrentPos({ latitude: center.lat, longitude: center.lng });
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      <div className="p-6 bg-slate-950/80 backdrop-blur-md flex justify-between items-center border-b border-white/5">
        <h2 className="font-black uppercase text-xs tracking-widest">{t.confirm}</h2>
        <button onClick={onCancel} className="text-slate-400 p-2"><i className="fas fa-times text-xl"></i></button>
      </div>

      <div ref={mapContainerRef} className="flex-1 relative">
        {/* Crosshair visual helper */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[310]">
          <div className="w-8 h-8 border-2 border-indigo-500/30 rounded-full flex items-center justify-center">
             <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="p-8 bg-slate-950/90 backdrop-blur-xl border-t border-white/5">
        <button 
          onClick={() => onConfirm(currentPos)}
          className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all"
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
