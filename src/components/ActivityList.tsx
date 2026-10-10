import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity } from '../types';
import { Clock, BarChart, CheckCircle2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'activities'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activityData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activityData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive"></div>
      </div>
    );
  }

  const openGallery = (activity: Activity) => {
    setSelectedActivity(activity);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (!selectedActivity) return;
    const allImages = [selectedActivity.imageUrl, ...(selectedActivity.galleryUrls || [])];
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (!selectedActivity) return;
    const allImages = [selectedActivity.imageUrl, ...(selectedActivity.galleryUrls || [])];
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="serif text-5xl md:text-6xl text-olive mb-4">Actividades y Aventuras</h1>
        <p className="text-ink/60 max-w-2xl mx-auto text-lg">
          Explora la naturaleza y vive experiencias inolvidables en el Río La Miel y sus alrededores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {activities.map((activity) => (
          <div key={activity.id} className="card overflow-hidden h-full flex flex-col transition-transform duration-300 hover:-translate-y-2">
            <div className="relative h-64 overflow-hidden">
              <img 
                src={activity.imageUrl || `https://picsum.photos/seed/${activity.id}/800/600`} 
                alt={activity.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                referrerPolicy="no-referrer"
              />
              {activity.galleryUrls && activity.galleryUrls.length > 0 && (
                <button 
                  onClick={() => openGallery(activity)}
                  className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 backdrop-blur text-white px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <ImageIcon size={16} />
                  <span>+{activity.galleryUrls.length}</span>
                </button>
              )}
              {activity.cost > 0 ? (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-olive">
                  + ${activity.cost.toLocaleString()}
                </div>
              ) : (
                <div className="absolute top-4 right-4 bg-olive/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-white">
                  Incluido
                </div>
              )}
            </div>
            
            <div className="p-8 flex-grow flex flex-col">
              <h3 className="serif text-2xl mb-2 text-olive">{activity.name}</h3>
              <p className="text-ink/60 text-sm mb-6 flex-grow">
                {activity.details || activity.description}
              </p>
              
              <div className="space-y-4 mt-auto">
                <div className="flex items-center justify-between text-sm text-ink/70 bg-cream p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-olive" />
                    <span>{activity.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart size={16} className="text-olive" />
                    <span>{activity.difficulty}</span>
                  </div>
                </div>

                {activity.includes && activity.includes.length > 0 && activity.includes[0] !== "" && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-olive mb-2">Incluye:</h4>
                    <ul className="space-y-1">
                      {activity.includes.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-ink/60">
                          <CheckCircle2 size={14} className="text-olive mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-20">
          <p className="serif text-2xl text-ink/40">No hay actividades disponibles en este momento.</p>
        </div>
      )}

      {/* Gallery Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button 
            onClick={() => setSelectedActivity(null)}
            className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
          >
            <X size={32} />
          </button>
          
          <div className="relative w-full max-w-5xl aspect-video flex items-center justify-center">
            {(() => {
              const allImages = [selectedActivity.imageUrl, ...(selectedActivity.galleryUrls || [])];
              return (
                <>
                  <img 
                    src={allImages[currentImageIndex]} 
                    alt={`${selectedActivity.name} - Imagen ${currentImageIndex + 1}`}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in fade-in duration-300"
                    referrerPolicy="no-referrer"
                  />
                  
                  {allImages.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur transition-colors"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur transition-colors"
                      >
                        <ChevronRight size={24} />
                      </button>
                      
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30 hover:bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
