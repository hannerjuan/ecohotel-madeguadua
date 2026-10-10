import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, setupAdminReservationNotifications, requestNotificationPermission } from '../lib/firebase';
import { Cabin, Reservation, Activity } from '../types';
import { Plus, Trash2, Edit2, X, Save, Calendar as CalendarIcon, Home as HomeIcon, Compass, Info, DollarSign, Clock, BarChart, Upload, Loader2, ChevronLeft, ChevronRight, List, Bell, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminDashboard() {
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cabins' | 'reservations' | 'activities'>('cabins');
  const [isUploading, setIsUploading] = useState(false);
  const [resViewMode, setResViewMode] = useState<'list' | 'calendar'>('list');
  const [filterCabin, setFilterCabin] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');

  useEffect(() => {
    // Set up notifications if already granted
    let unsubscribeNotifications: (() => void) | undefined;
    if (notificationsEnabled) {
      unsubscribeNotifications = setupAdminReservationNotifications();
    }
    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [notificationsEnabled]);

  const enableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token || Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    } else {
      alert('Debes permitir las notificaciones en tu navegador para recibir alertas.');
    }
  };

  const filteredReservations = reservations.filter(res => {
    const matchCabin = filterCabin === 'all' || res.cabinId === filterCabin;
    const matchStatus = filterStatus === 'all' || res.status === filterStatus;
    
    let matchDate = true;
    if (filterDateFrom && filterDateTo) {
      matchDate = res.checkIn <= filterDateTo && res.checkOut >= filterDateFrom;
    } else if (filterDateFrom) {
      matchDate = res.checkOut >= filterDateFrom;
    } else if (filterDateTo) {
      matchDate = res.checkIn <= filterDateTo;
    }

    return matchCabin && matchStatus && matchDate;
  });

  const [formData, setFormData] = useState<Partial<Cabin>>({
    name: '',
    description: '',
    price: 0,
    capacity: 2,
    amenities: [],
    imageUrl: '',
    galleryUrls: [],
  });

  const [activityData, setActivityData] = useState<Partial<Activity>>({
    name: '',
    description: '',
    details: '',
    cost: 0,
    duration: '',
    difficulty: 'Fácil',
    imageUrl: '',
    galleryUrls: [],
    includes: [],
  });
  const [itemToDelete, setItemToDelete] = useState<{ collectionName: string, id: string } | null>(null);

  useEffect(() => {
    const qCabins = query(collection(db, 'cabins'));
    const unsubscribeCabins = onSnapshot(qCabins, (snapshot) => {
      setCabins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cabin[]);
    });

    const qReservations = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    const unsubscribeReservations = onSnapshot(qReservations, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[]);
    });

    const qActivities = query(collection(db, 'activities'));
    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Activity[]);
    });

    return () => {
      unsubscribeCabins();
      unsubscribeReservations();
      unsubscribeActivities();
    };
  }, []);

  const handleSaveCabin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        galleryUrls: formData.galleryUrls?.map(s => s.trim()).filter(Boolean) || [],
        amenities: formData.amenities?.map(s => s.trim()).filter(Boolean) || []
      };
      if (editingId) {
        await updateDoc(doc(db, 'cabins', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'cabins'), dataToSave);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving cabin:", error);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...activityData,
        galleryUrls: activityData.galleryUrls?.map(s => s.trim()).filter(Boolean) || [],
        includes: activityData.includes?.map(s => s.trim()).filter(Boolean) || []
      };
      if (editingId) {
        await updateDoc(doc(db, 'activities', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'activities'), dataToSave);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving activity:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'galleryUrls', isActivity: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }

      if (isActivity) {
        if (field === 'imageUrl') {
          setActivityData(prev => ({ ...prev, imageUrl: uploadedUrls[0] }));
        } else if (field === 'galleryUrls') {
          setActivityData(prev => ({ 
            ...prev, 
            galleryUrls: [...(prev.galleryUrls || []), ...uploadedUrls] 
          }));
        }
      } else {
        if (field === 'imageUrl') {
          setFormData(prev => ({ ...prev, imageUrl: uploadedUrls[0] }));
        } else if (field === 'galleryUrls') {
          setFormData(prev => ({ 
            ...prev, 
            galleryUrls: [...(prev.galleryUrls || []), ...uploadedUrls] 
          }));
        }
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      if (error.message?.includes('storage is not available') || error.code === 'storage/unknown') {
        alert("El código de subida está listo, pero Firebase Storage no está habilitado en tu proyecto de Firebase. Habilítalo en la consola de Firebase para usar esta función en producción.");
      } else {
        alert("Hubo un error subiendo la imagen. Verifica tu conexión o la configuración de Firebase Storage.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (collectionName: string, id: string) => {
    setItemToDelete({ collectionName, id });
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteDoc(doc(db, itemToDelete.collectionName, itemToDelete.id));
        if (itemToDelete.collectionName === 'reservations' && selectedReservation?.id === itemToDelete.id) {
          setSelectedReservation(null);
        }
      } catch (error) {
        console.error("Error deleting document:", error);
      } finally {
        setItemToDelete(null);
      }
    }
  };

  const updateReservationStatus = async (id: string, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status: newStatus });
      setSelectedReservation(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error("Error updating reservation status:", error);
      alert("Hubo un error al actualizar el estado de la reserva.");
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: 0, capacity: 2, amenities: [], imageUrl: '', galleryUrls: [] });
    setActivityData({ name: '', description: '', details: '', cost: 0, duration: '', difficulty: 'Fácil', imageUrl: '', galleryUrls: [], includes: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEditCabin = (cabin: Cabin) => {
    setFormData(cabin);
    setEditingId(cabin.id);
    setIsAdding(true);
  };

  const startEditActivity = (activity: Activity) => {
    setActivityData(activity);
    setEditingId(activity.id);
    setIsAdding(true);
  };

  const removeGalleryImage = (index: number, isActivity: boolean = false) => {
    if (isActivity) {
      setActivityData(prev => ({
        ...prev,
        galleryUrls: prev.galleryUrls?.filter((_, i) => i !== index)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        galleryUrls: prev.galleryUrls?.filter((_, i) => i !== index)
      }));
    }
  };

  const exportReservationsToCSV = () => {
    if (filteredReservations.length === 0) {
      alert('No hay reservas para exportar con los filtros actuales.');
      return;
    }

    const headers = ['ID', 'Nombre', 'Cabaña', 'Check-in', 'Check-out', 'WhatsApp', 'Estado', 'Fecha de Creación'];
    
    const rows = filteredReservations.map(res => {
      const createdAt = res.createdAt?.toDate ? format(res.createdAt.toDate(), "yyyy-MM-dd HH:mm:ss") : '';
      return [
        res.id,
        `"${res.guestName.replace(/"/g, '""')}"`,
        `"${res.cabinName.replace(/"/g, '""')}"`,
        res.checkIn,
        res.checkOut,
        res.whatsappNumber,
        res.status,
        createdAt
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reservas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="flex items-center gap-4">
          <h1 className="serif text-4xl text-olive">Panel de Administración</h1>
          {!notificationsEnabled && (
            <button
              onClick={enableNotifications}
              className="flex items-center gap-2 px-3 py-1.5 bg-olive/10 text-olive rounded-full text-sm font-medium hover:bg-olive/20 transition-colors"
              title="Activar notificaciones de nuevas reservas"
            >
              <Bell size={16} />
              Activar Alertas
            </button>
          )}
        </div>
        
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-olive/10 overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('cabins'); resetForm(); }}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'cabins' ? 'bg-olive text-white shadow-md' : 'text-ink/60 hover:text-olive'}`}
          >
            Cabañas
          </button>
          <button 
            onClick={() => { setActiveTab('activities'); resetForm(); }}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'activities' ? 'bg-olive text-white shadow-md' : 'text-ink/60 hover:text-olive'}`}
          >
            Actividades
          </button>
          <button 
            onClick={() => { setActiveTab('reservations'); resetForm(); }}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'reservations' ? 'bg-olive text-white shadow-md' : 'text-ink/60 hover:text-olive'}`}
          >
            Reservas
          </button>
        </div>
      </div>

      {activeTab === 'cabins' && (
        <>
          <div className="flex justify-end mb-8">
            {!isAdding && (
              <button onClick={() => setIsAdding(true)} className="olive-button flex items-center gap-2">
                <Plus size={20} /> Nueva Cabaña
              </button>
            )}
          </div>

          {isAdding && (
            <div className="card p-8 mb-12 border-2 border-olive/20">
              <div className="flex justify-between items-center mb-8">
                <h2 className="serif text-2xl text-olive">{editingId ? 'Editar Cabaña' : 'Nueva Cabaña'}</h2>
                <button onClick={resetForm} className="text-ink/40 hover:text-ink"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveCabin} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <input required type="text" placeholder="Nombre" className="w-full bg-cream rounded-xl p-3 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input required type="number" placeholder="Precio" className="w-full bg-cream rounded-xl p-3 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                  <input required type="number" placeholder="Capacidad" className="w-full bg-cream rounded-xl p-3 outline-none" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-ink/60 uppercase tracking-wider">Imagen Principal *</label>
                    <div className="flex gap-2">
                      <input required type="url" placeholder="URL Imagen Principal" className="flex-grow bg-cream rounded-xl p-3 outline-none" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                      <label className={`bg-olive/10 text-olive p-3 rounded-xl cursor-pointer hover:bg-olive/20 transition-colors flex items-center justify-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'imageUrl')} disabled={isUploading} />
                      </label>
                    </div>
                    {formData.imageUrl && (
                      <div className="mt-4 relative rounded-2xl overflow-hidden border border-olive/10 bg-olive/5 aspect-video max-w-md">
                        <img 
                          src={formData.imageUrl} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Error+de+Imagen'; }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-ink/60 uppercase tracking-wider">Galería de Imágenes</label>
                    <div className="flex gap-2">
                      <label className={`w-full bg-olive/10 text-olive p-3 rounded-xl cursor-pointer hover:bg-olive/20 transition-colors flex items-center justify-center gap-2 font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        Subir Imágenes a la Galería
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e, 'galleryUrls')} disabled={isUploading} />
                      </label>
                    </div>
                    {formData.galleryUrls && formData.galleryUrls.filter(url => url.trim() !== '').length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {formData.galleryUrls.filter(url => url.trim() !== '').map((url, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-olive/10 bg-olive/5">
                            <img src={url.trim()} alt={`Galería ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(idx, false)}
                              className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                              title="Eliminar imagen"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <textarea required rows={3} placeholder="Descripción" className="w-full bg-cream rounded-xl p-3 outline-none resize-none" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                  <input type="text" placeholder="Comodidades (coma)" className="w-full bg-cream rounded-xl p-3 outline-none" value={formData.amenities?.join(',') || ''} onChange={e => setFormData({...formData, amenities: e.target.value.split(',')})} />
                  <button type="submit" disabled={isUploading} className="w-full olive-button flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save size={20} /> {isUploading ? 'Subiendo...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {cabins.map(cabin => (
              <div key={cabin.id} className="card p-4 flex items-center gap-4">
                <img src={cabin.imageUrl || `https://picsum.photos/seed/${cabin.id}/100/100`} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-grow">
                  <h3 className="serif text-lg text-olive">{cabin.name}</h3>
                  <p className="text-xs text-ink/40">${cabin.price.toLocaleString()} • {cabin.capacity} pers.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditCabin(cabin)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete('cabins', cabin.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'activities' && (
        <>
          <div className="flex justify-end mb-8">
            {!isAdding && (
              <button onClick={() => setIsAdding(true)} className="olive-button flex items-center gap-2">
                <Plus size={20} /> Nueva Actividad
              </button>
            )}
          </div>

          {isAdding && (
            <div className="card p-8 mb-12 border-2 border-olive/20">
              <div className="flex justify-between items-center mb-8">
                <h2 className="serif text-2xl text-olive">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
                <button onClick={resetForm} className="text-ink/40 hover:text-ink"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveActivity} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <input required type="text" placeholder="Nombre (ej: Viaje en Lancha)" className="w-full bg-cream rounded-xl p-3 outline-none" value={activityData.name} onChange={e => setActivityData({...activityData, name: e.target.value})} />
                  <input required type="text" placeholder="Descripción corta" className="w-full bg-cream rounded-xl p-3 outline-none" value={activityData.description} onChange={e => setActivityData({...activityData, description: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" placeholder="Costo Adicional" className="w-full bg-cream rounded-xl p-3 outline-none" value={activityData.cost} onChange={e => setActivityData({...activityData, cost: Number(e.target.value)})} />
                    <input required type="text" placeholder="Duración (ej: 3h)" className="w-full bg-cream rounded-xl p-3 outline-none" value={activityData.duration} onChange={e => setActivityData({...activityData, duration: e.target.value})} />
                  </div>
                  <select className="w-full bg-cream rounded-xl p-3 outline-none" value={activityData.difficulty} onChange={e => setActivityData({...activityData, difficulty: e.target.value as any})}>
                    <option value="Fácil">Fácil</option>
                    <option value="Moderada">Moderada</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <textarea required rows={3} placeholder="Detalles (de qué se trata)" className="w-full bg-cream rounded-xl p-3 outline-none resize-none" value={activityData.details || ''} onChange={e => setActivityData({...activityData, details: e.target.value})} />
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-ink/60 uppercase tracking-wider">Imagen Principal *</label>
                    <div className="flex gap-2">
                      <input required type="url" placeholder="URL Imagen Principal" className="flex-grow bg-cream rounded-xl p-3 outline-none" value={activityData.imageUrl || ''} onChange={e => setActivityData({...activityData, imageUrl: e.target.value})} />
                      <label className={`bg-olive/10 text-olive p-3 rounded-xl cursor-pointer hover:bg-olive/20 transition-colors flex items-center justify-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'imageUrl', true)} disabled={isUploading} />
                      </label>
                    </div>
                    {activityData.imageUrl && (
                      <div className="mt-4 relative rounded-2xl overflow-hidden border border-olive/10 bg-olive/5 aspect-video max-w-md">
                        <img 
                          src={activityData.imageUrl} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Error+de+Imagen'; }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-ink/60 uppercase tracking-wider">Galería de Imágenes</label>
                    <div className="flex gap-2">
                      <label className={`w-full bg-olive/10 text-olive p-3 rounded-xl cursor-pointer hover:bg-olive/20 transition-colors flex items-center justify-center gap-2 font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        Subir Imágenes a la Galería
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e, 'galleryUrls', true)} disabled={isUploading} />
                      </label>
                    </div>
                    {activityData.galleryUrls && activityData.galleryUrls.filter(url => url.trim() !== '').length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {activityData.galleryUrls.filter(url => url.trim() !== '').map((url, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-olive/10 bg-olive/5">
                            <img src={url.trim()} alt={`Galería ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(idx, true)}
                              className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                              title="Eliminar imagen"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input type="text" placeholder="Incluye (coma)" className="w-full bg-cream rounded-xl p-3 outline-none" value={activityData.includes?.join(',') || ''} onChange={e => setActivityData({...activityData, includes: e.target.value.split(',')})} />
                  <button type="submit" disabled={isUploading} className="w-full olive-button flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save size={20} /> {isUploading ? 'Subiendo...' : 'Guardar Actividad'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {activities.map(activity => (
              <div key={activity.id} className="card p-4 flex items-center gap-4">
                <img src={activity.imageUrl || `https://picsum.photos/seed/${activity.id}/100/100`} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-grow">
                  <h3 className="serif text-lg text-olive">{activity.name}</h3>
                  <div className="flex gap-3 text-[10px] text-ink/40 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock size={10} /> {activity.duration}</span>
                    <span className="flex items-center gap-1"><BarChart size={10} /> {activity.difficulty}</span>
                    <span className="flex items-center gap-1 font-bold text-olive"><DollarSign size={10} /> {activity.cost > 0 ? activity.cost.toLocaleString() : 'Incluido'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditActivity(activity)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete('activities', activity.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'reservations' && (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl border border-olive/10 shadow-sm">
            <div className="flex gap-2">
              <button 
                onClick={() => setResViewMode('list')}
                className={`p-2 rounded-xl flex items-center gap-2 transition-colors ${resViewMode === 'list' ? 'bg-olive text-white' : 'bg-cream text-ink/60 hover:text-olive'}`}
              >
                <List size={18} /> <span className="text-sm font-medium">Lista</span>
              </button>
              <button 
                onClick={() => setResViewMode('calendar')}
                className={`p-2 rounded-xl flex items-center gap-2 transition-colors ${resViewMode === 'calendar' ? 'bg-olive text-white' : 'bg-cream text-ink/60 hover:text-olive'}`}
              >
                <CalendarIcon size={18} /> <span className="text-sm font-medium">Calendario</span>
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <select 
                className="bg-cream rounded-xl p-2.5 text-sm outline-none border-none text-ink/80"
                value={filterCabin}
                onChange={(e) => setFilterCabin(e.target.value)}
              >
                <option value="all">Todas las cabañas</option>
                {cabins.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select 
                className="bg-cream rounded-xl p-2.5 text-sm outline-none border-none text-ink/80"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="cancelled">Cancelada</option>
              </select>

              <div className="flex items-center gap-2 bg-cream rounded-xl px-3 py-1.5">
                <span className="text-xs text-ink/60 font-medium">Desde:</span>
                <input 
                  type="date" 
                  className="bg-transparent text-sm outline-none border-none text-ink/80"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-cream rounded-xl px-3 py-1.5">
                <span className="text-xs text-ink/60 font-medium">Hasta:</span>
                <input 
                  type="date" 
                  className="bg-transparent text-sm outline-none border-none text-ink/80"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
              
              <button 
                onClick={exportReservationsToCSV}
                className="ml-auto xl:ml-2 flex items-center gap-2 px-4 py-2 bg-olive/10 text-olive rounded-xl text-sm font-medium hover:bg-olive/20 transition-colors"
                title="Exportar a CSV"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            </div>
          </div>

          {resViewMode === 'list' ? (
            <div className="space-y-4">
              {filteredReservations.map(res => (
                <div 
                  key={res.id} 
                  className="card p-6 cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-olive/20"
                  onClick={() => setSelectedReservation(res)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="serif text-xl">{res.guestName}</h3>
                      <p className="text-xs text-olive font-bold uppercase tracking-widest">{res.cabinName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{res.status}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-[10px] text-ink/40 uppercase">Check-in</p><p className="font-medium">{res.checkIn}</p></div>
                    <div><p className="text-[10px] text-ink/40 uppercase">Check-out</p><p className="font-medium">{res.checkOut}</p></div>
                    <div><p className="text-[10px] text-ink/40 uppercase">WhatsApp</p><a href={`https://wa.me/${res.whatsappNumber.replace(/\D/g, '')}`} className="text-olive underline">{res.whatsappNumber}</a></div>
                    <div><p className="text-[10px] text-ink/40 uppercase">Fecha</p><p className="text-ink/40">{res.createdAt?.toDate ? format(res.createdAt.toDate(), "d MMM", { locale: es }) : '...'}</p></div>
                  </div>
                </div>
              ))}
              {filteredReservations.length === 0 && (
                <div className="text-center py-12 text-ink/40">
                  No hay reservas que coincidan con los filtros.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-olive/10 overflow-x-auto">
              <div className="flex justify-between items-center mb-6 min-w-[600px]">
                <h3 className="serif text-2xl text-olive capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl bg-cream hover:bg-olive/10 text-olive transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl bg-cream hover:bg-olive/10 text-olive transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="min-w-[600px]">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-ink/40 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart);
                    const endDate = endOfWeek(monthEnd);
                    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                    return calendarDays.map(day => {
                      const dayReservations = filteredReservations.filter(res => {
                        const checkIn = parseISO(res.checkIn);
                        const checkOut = parseISO(res.checkOut);
                        const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                        const normalizedCheckIn = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
                        const normalizedCheckOut = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
                        return normalizedDay >= normalizedCheckIn && normalizedDay <= normalizedCheckOut;
                      });

                      return (
                        <div 
                          key={day.toString()} 
                          className={`min-h-[100px] p-1 border border-cream rounded-lg flex flex-col ${!isSameMonth(day, monthStart) ? 'bg-cream/30 opacity-50' : 'bg-white'}`}
                        >
                          <span className={`text-xs font-medium p-1 mb-1 self-start ${isSameDay(day, new Date()) ? 'bg-olive text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-ink/60'}`}>
                            {format(day, 'd')}
                          </span>
                          <div className="flex-grow flex flex-col gap-1 overflow-y-auto">
                            {dayReservations.map(res => {
                              const checkIn = parseISO(res.checkIn);
                              const checkOut = parseISO(res.checkOut);
                              const isStart = isSameDay(day, checkIn);
                              const isEnd = isSameDay(day, checkOut);
                              const cabin = cabins.find(c => c.id === res.cabinId);
                              
                              return (
                                <div 
                                  key={res.id} 
                                  onClick={() => setSelectedReservation(res)}
                                  className={`text-[10px] px-1.5 py-1 leading-tight truncate cursor-pointer hover:opacity-80 transition-opacity ${res.status === 'confirmed' ? 'bg-olive/20 text-olive' : res.status === 'cancelled' ? 'bg-red-100 text-red-800 line-through' : 'bg-yellow-100 text-yellow-800'} ${isStart ? 'rounded-l-md border-l-2 border-olive' : ''} ${isEnd ? 'rounded-r-md' : ''} ${!isStart && !isEnd ? 'rounded-none' : ''}`}
                                  title={`${res.guestName} - ${cabin?.name}`}
                                >
                                  {isStart ? `${res.guestName.split(' ')[0]} - ${cabin?.name}` : '\u00A0'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Reservation Details Modal */}
          {selectedReservation && (() => {
            const cabin = cabins.find(c => c.id === selectedReservation.cabinId);
            const pricePerNight = cabin ? cabin.price : 0;
            const checkInDate = new Date(selectedReservation.checkIn);
            const checkOutDate = new Date(selectedReservation.checkOut);
            const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
            const totalCost = nights * pricePerNight;

            return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-olive/10 flex justify-between items-center bg-cream/30">
                  <h3 className="serif text-2xl text-olive">Detalles de la Reserva</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete('reservations', selectedReservation.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors" title="Eliminar Reserva">
                      <Trash2 size={20} />
                    </button>
                    <button onClick={() => setSelectedReservation(null)} className="text-ink/40 hover:text-ink p-2 rounded-full hover:bg-white transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-ink/40 uppercase tracking-widest mb-1">Huésped</p>
                      <p className="text-xl font-medium">{selectedReservation.guestName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedReservation.status === 'confirmed' ? 'bg-green-100 text-green-700' : selectedReservation.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selectedReservation.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cream/50 p-4 rounded-2xl">
                      <p className="text-xs text-ink/40 uppercase tracking-widest mb-1">Cabaña</p>
                      <p className="font-medium text-olive">{selectedReservation.cabinName}</p>
                    </div>
                    <div className="bg-cream/50 p-4 rounded-2xl">
                      <p className="text-xs text-ink/40 uppercase tracking-widest mb-1">WhatsApp</p>
                      <a href={`https://wa.me/${selectedReservation.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-olive hover:underline flex items-center gap-2">
                        {selectedReservation.whatsappNumber}
                      </a>
                    </div>
                    <div className="bg-cream/50 p-4 rounded-2xl">
                      <p className="text-xs text-ink/40 uppercase tracking-widest mb-1">Check-in</p>
                      <p className="font-medium">{selectedReservation.checkIn}</p>
                    </div>
                    <div className="bg-cream/50 p-4 rounded-2xl">
                      <p className="text-xs text-ink/40 uppercase tracking-widest mb-1">Check-out</p>
                      <p className="font-medium">{selectedReservation.checkOut}</p>
                    </div>
                  </div>

                  <div className="bg-olive/5 p-4 rounded-2xl border border-olive/10">
                    <h4 className="text-sm font-bold text-olive mb-3">Resumen de Costos</h4>
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-ink/60">Precio por noche</span>
                      <span className="font-medium">${pricePerNight.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-ink/60">Duración de la estancia</span>
                      <span className="font-medium">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-olive/10">
                      <span className="font-bold text-olive">Costo Total</span>
                      <span className="font-bold text-xl text-olive">${totalCost.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-olive/10">
                    <p className="text-xs text-ink/40 uppercase tracking-widest mb-1">Fecha de Solicitud</p>
                    <p className="text-sm text-ink/60">
                      {selectedReservation.createdAt?.toDate ? format(selectedReservation.createdAt.toDate(), "PPP 'a las' p", { locale: es }) : 'Desconocida'}
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-cream/30 border-t border-olive/10 flex justify-between items-center">
                  <div className="flex gap-2">
                    {selectedReservation.status !== 'confirmed' && (
                      <button 
                        onClick={() => updateReservationStatus(selectedReservation.id, 'confirmed')}
                        className="px-4 py-2 rounded-xl font-medium text-white bg-green-600 hover:bg-green-700 transition-colors text-sm"
                      >
                        Aprobar Reserva
                      </button>
                    )}
                    {selectedReservation.status !== 'cancelled' && (
                      <button 
                        onClick={() => updateReservationStatus(selectedReservation.id, 'cancelled')}
                        className="px-4 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors text-sm"
                      >
                        Cancelar Reserva
                      </button>
                    )}
                    {selectedReservation.status === 'cancelled' && (
                      <button 
                        onClick={() => updateReservationStatus(selectedReservation.id, 'pending')}
                        className="px-4 py-2 rounded-xl font-medium text-ink/60 bg-white hover:bg-olive/10 transition-colors text-sm border border-olive/10"
                      >
                        Marcar Pendiente
                      </button>
                    )}
                  </div>
                  <button onClick={() => setSelectedReservation(null)} className="px-6 py-2 rounded-xl font-medium text-ink/60 hover:text-ink hover:bg-white transition-colors">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )})()}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="serif text-2xl text-olive mb-2">¿Eliminar elemento?</h3>
              <p className="text-ink/60 mb-6">
                Esta acción no se puede deshacer. El elemento será eliminado permanentemente.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)} 
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-ink/60 bg-cream hover:bg-olive/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
