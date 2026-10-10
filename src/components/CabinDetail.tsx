import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Cabin, Review } from '../types';
import { Users, ChevronLeft, ChevronRight, Send, CheckCircle2, X, Calendar as CalendarIcon, Sparkles, Star, Wifi, Coffee, Wind, Mountain, Grid } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('es', es);

export default function CabinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cabin, setCabin] = useState<Cabin | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    whatsappNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dateError, setDateError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [bookedDates, setBookedDates] = useState<{start: Date, end: Date}[]>([]);
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ guestName: '', comment: '', rating: 5 });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  let isAvailable: boolean | null = null;
  let conflictEnd: Date | null = null;

  const localCheckIn = parseDateLocal(bookingData.checkIn);
  const localCheckOut = parseDateLocal(bookingData.checkOut);

  if (localCheckIn && localCheckOut && localCheckOut > localCheckIn) {
    const conflict = bookedDates.find(booked => {
      return localCheckIn < booked.end && localCheckOut > booked.start;
    });
    if (conflict) {
      isAvailable = false;
      conflictEnd = conflict.end;
    } else {
      isAvailable = true;
    }
  }

  const checkInExcludedIntervals = bookedDates.map(b => ({
    start: b.start,
    end: new Date(b.end.getTime() - 86400000)
  }));

  const checkOutExcludedIntervals = bookedDates.map(b => ({
    start: new Date(b.start.getTime() + 86400000),
    end: b.end
  }));

  const nextReservation = localCheckIn 
    ? bookedDates.find(b => b.start >= localCheckIn) 
    : undefined;

  const maxCheckOutDate = nextReservation ? nextReservation.start : undefined;

  useEffect(() => {
    const fetchCabin = async () => {
      if (!id) return;
      const docRef = doc(db, 'cabins', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCabin({ id: docSnap.id, ...docSnap.data() } as Cabin);
      }
      setLoading(false);
    };
    fetchCabin();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'reservations'), 
      where('cabinId', '==', id), 
      where('status', '==', 'confirmed')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dates = snapshot.docs.map(doc => {
        const data = doc.data();
        const [inYear, inMonth, inDay] = data.checkIn.split('-').map(Number);
        const [outYear, outMonth, outDay] = data.checkOut.split('-').map(Number);
        return {
          start: new Date(inYear, inMonth - 1, inDay),
          end: new Date(outYear, outMonth - 1, outDay)
        };
      });
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const futureDates = dates
        .filter(d => d.end >= today)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
        
      setBookedDates(futureDates);
    });

    const qReviews = query(
      collection(db, 'reviews'),
      where('cabinId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(fetchedReviews);
    });
    
    return () => {
      unsubscribe();
      unsubscribeReviews();
    };
  }, [id]);

  const getRecommendedDates = () => {
    const recommendations: { start: Date, end: Date | null }[] = [];
    let current = new Date();
    current.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() + 1); // Start recommending from tomorrow
    
    for (const booking of bookedDates) {
      if (current < booking.start) {
        const diffTime = booking.start.getTime() - current.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 2) { // At least 2 nights available
          recommendations.push({ start: new Date(current), end: new Date(booking.start) });
        }
      }
      if (current < booking.end) {
        current = new Date(booking.end);
      }
    }
    
    if (recommendations.length < 3) {
      recommendations.push({ start: new Date(current), end: null });
    }
    
    return recommendations.slice(0, 3);
  };

  const recommendedDates = getRecommendedDates();

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewForm.guestName || !reviewForm.comment) return;

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        cabinId: id,
        guestName: reviewForm.guestName,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        createdAt: serverTimestamp()
      });
      setReviewForm({ guestName: '', comment: '', rating: 5 });
      alert('¡Gracias por tu reseña!');
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Hubo un error al enviar la reseña. Inténtalo de nuevo.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabin || !id) return;
    
    setDateError('');
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    
    if (checkOutDate <= checkInDate) {
      setDateError('La fecha de check-out debe ser posterior a la fecha de check-in.');
      return;
    }

    if (isAvailable === false) {
      setDateError('La cabaña no está disponible en las fechas seleccionadas. Por favor, revisa las fechas no disponibles.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to Firestore
      await addDoc(collection(db, 'reservations'), {
        ...bookingData,
        cabinId: id,
        cabinName: cabin.name,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Prepare WhatsApp message
      const message = `¡Hola EcoHotel Guadua! Me gustaría reservar la cabaña *${cabin.name}*.\n\n` +
        `*Nombre:* ${bookingData.guestName}\n` +
        `*Check-in:* ${bookingData.checkIn}\n` +
        `*Check-out:* ${bookingData.checkOut}\n` +
        `*WhatsApp:* ${bookingData.whatsappNumber}\n\n` +
        `¿Está disponible para estas fechas?`;
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/573044527620?text=${encodedMessage}`; // Replace with real hotel number

      setSuccess(true);
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 2000);
    } catch (error) {
      console.error("Error saving reservation:", error);
      alert("Hubo un error al procesar tu reserva. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLightboxOpen]);

  if (loading) {
    return <div className="flex justify-center items-center h-96 animate-pulse serif text-xl">Cargando...</div>;
  }

  if (!cabin) {
    return <div className="text-center py-20 serif text-2xl">Cabaña no encontrada</div>;
  }

  const allImages = [cabin.imageUrl, ...(cabin.galleryUrls || [])].filter(Boolean);

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-olive hover:underline mb-8 font-medium"
      >
        <ChevronLeft size={20} /> Volver a la lista
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div>
          {allImages.length >= 3 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-8 rounded-[40px] overflow-hidden shadow-2xl relative">
              <div 
                className="col-span-2 row-span-2 relative group cursor-pointer"
                onClick={() => { setIsLightboxOpen(true); setSelectedImageIndex(0); }}
              >
                <img 
                  src={allImages[0] || `https://picsum.photos/seed/${cabin.id}-0/1200/1600`} 
                  alt={cabin.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
              </div>
              
              <div 
                className="col-span-2 row-span-1 relative group cursor-pointer"
                onClick={() => { setIsLightboxOpen(true); setSelectedImageIndex(1); }}
              >
                <img 
                  src={allImages[1] || `https://picsum.photos/seed/${cabin.id}-1/800/600`} 
                  alt={cabin.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
              </div>

              <div 
                className="col-span-1 row-span-1 relative group cursor-pointer"
                onClick={() => { setIsLightboxOpen(true); setSelectedImageIndex(2); }}
              >
                <img 
                  src={allImages[2] || `https://picsum.photos/seed/${cabin.id}-2/800/600`} 
                  alt={cabin.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
              </div>

              <div 
                className="col-span-1 row-span-1 relative group cursor-pointer"
                onClick={() => { setIsLightboxOpen(true); setSelectedImageIndex(Math.min(3, allImages.length - 1)); }}
              >
                <img 
                  src={allImages[3] || `https://picsum.photos/seed/${cabin.id}-3/800/600`} 
                  alt={cabin.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <div className="flex flex-col items-center text-white bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl">
                    <Grid size={24} className="mb-1" />
                    <span className="font-medium text-sm">Ver todas</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="rounded-[40px] overflow-hidden shadow-2xl mb-8 cursor-pointer relative group"
              onClick={() => setIsLightboxOpen(true)}
            >
              <img 
                src={allImages[0] || `https://picsum.photos/seed/${cabin.id}/1200/1600`} 
                alt={cabin.name}
                className="w-full h-[500px] object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white bg-black/50 px-6 py-3 rounded-full backdrop-blur-sm font-medium">Ver Galería</span>
              </div>
            </div>
          )}
          
          <div className="flex items-end gap-6 mb-6">
            <h1 className="serif text-5xl text-olive">{cabin.name}</h1>
            {averageRating && (
              <div className="flex items-center gap-2 bg-olive/10 px-4 py-2 rounded-2xl mb-2">
                <Star className="fill-olive text-olive" size={24} />
                <span className="text-2xl font-bold text-olive leading-none">{averageRating}</span>
                <span className="text-sm text-ink/60 font-medium">({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-olive/10 text-olive px-4 py-2 rounded-full flex items-center gap-2 font-semibold">
              <Users size={20} />
              <span>Hasta {cabin.capacity} personas</span>
            </div>
            <div className="text-2xl font-bold text-olive">
              ${cabin.price.toLocaleString()} <span className="text-sm font-normal text-ink/50">/ noche</span>
            </div>
          </div>

          <div className="prose prose-olive max-w-none mb-12">
            <h3 className="serif text-2xl mb-4">Descripción</h3>
            <p className="text-ink/70 leading-relaxed whitespace-pre-line">
              {cabin.description}
            </p>
          </div>

          <div>
            <h3 className="serif text-2xl mb-4">Comodidades</h3>
            <div className="flex flex-wrap gap-3">
              {cabin.amenities?.map((amenity, idx) => {
                const getIcon = (name: string) => {
                  switch (name) {
                    case 'Wifi': return <Wifi size={16} className="text-olive" />;
                    case 'Café': return <Coffee size={16} className="text-olive" />;
                    case 'Aire Acondicionado': return <Wind size={16} className="text-olive" />;
                    case 'Vista a la Montaña': return <Mountain size={16} className="text-olive" />;
                    default: return <CheckCircle2 size={16} className="text-olive" />;
                  }
                };

                return (
                  <span key={idx} className="bg-white border border-olive/10 px-4 py-2 rounded-2xl text-sm text-ink/70 flex items-center gap-2 shadow-sm">
                    {getIcon(amenity)}
                    {amenity}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-32 h-fit">
          <div className="card p-10">
            {success ? (
              <div className="text-center py-10">
                <div className="flex justify-center mb-6">
                  <CheckCircle2 size={64} className="text-green-600 animate-bounce" />
                </div>
                <h2 className="serif text-3xl text-olive mb-4">¡Solicitud Enviada!</h2>
                <p className="text-ink/60 mb-8">
                  Estamos abriendo WhatsApp para que puedas finalizar tu reserva directamente con nosotros.
                </p>
                <div className="animate-pulse text-sm text-olive font-medium">
                  Redirigiendo...
                </div>
              </div>
            ) : (
              <>
                <h2 className="serif text-3xl text-olive mb-8">Reserva tu estancia</h2>
                
                {bookedDates.length > 0 && (
                  <div className="mb-6 space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
                      <h4 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                        <CalendarIcon size={16} /> Fechas no disponibles
                      </h4>
                      <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                        {bookedDates.map((dates, idx) => (
                          <li key={idx}>
                            Del {format(dates.start, "d 'de' MMMM", { locale: es })} al {format(dates.end, "d 'de' MMMM", { locale: es })}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-olive/5 rounded-2xl border border-olive/10">
                      <h4 className="text-sm font-bold text-olive mb-3 flex items-center gap-2">
                        <Sparkles size={16} /> Fechas disponibles recomendadas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {recommendedDates.map((rec, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const checkIn = format(rec.start, 'yyyy-MM-dd');
                              let checkOut = '';
                              if (rec.end) {
                                const diffTime = rec.end.getTime() - rec.start.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays <= 5) {
                                  checkOut = format(rec.end, 'yyyy-MM-dd');
                                } else {
                                  checkOut = format(new Date(rec.start.getTime() + 2 * 86400000), 'yyyy-MM-dd');
                                }
                              } else {
                                checkOut = format(new Date(rec.start.getTime() + 2 * 86400000), 'yyyy-MM-dd');
                              }
                              setBookingData({ ...bookingData, checkIn, checkOut });
                              setDateError('');
                            }}
                            className="text-xs bg-white border border-olive/20 text-olive px-3 py-2 rounded-xl hover:bg-olive hover:text-white transition-colors text-left font-medium"
                          >
                            {rec.end 
                              ? `Del ${format(rec.start, "d MMM", { locale: es })} al ${format(rec.end, "d MMM", { locale: es })}`
                              : `A partir del ${format(rec.start, "d MMM", { locale: es })}`
                            }
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleBooking} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-2">Nombre Completo</label>
                    <input 
                      required
                      type="text"
                      className="w-full bg-cream border-none rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none"
                      placeholder="Tu nombre"
                      value={bookingData.guestName}
                      onChange={e => setBookingData({...bookingData, guestName: e.target.value})}
                    />
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink/60 mb-2">Check-in</label>
                        <DatePicker
                          required
                          locale="es"
                          dateFormat="yyyy-MM-dd"
                          minDate={new Date()}
                          excludeDateIntervals={checkInExcludedIntervals}
                          selected={localCheckIn}
                          onChange={(date: Date | null) => {
                            setBookingData({...bookingData, checkIn: date ? format(date, 'yyyy-MM-dd') : ''});
                            setDateError('');
                          }}
                          className="w-full bg-cream border-none rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none"
                          placeholderText="Selecciona fecha"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink/60 mb-2">Check-out</label>
                        <DatePicker
                          required
                          locale="es"
                          dateFormat="yyyy-MM-dd"
                          minDate={localCheckIn ? new Date(localCheckIn.getTime() + 86400000) : new Date(new Date().getTime() + 86400000)}
                          maxDate={maxCheckOutDate}
                          excludeDateIntervals={checkOutExcludedIntervals}
                          selected={localCheckOut}
                          onChange={(date: Date | null) => {
                            setBookingData({...bookingData, checkOut: date ? format(date, 'yyyy-MM-dd') : ''});
                            setDateError('');
                          }}
                          className="w-full bg-cream border-none rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none"
                          placeholderText="Selecciona fecha"
                        />
                      </div>
                    </div>
                    {dateError && (
                      <p className="text-red-500 text-sm font-medium mt-2">{dateError}</p>
                    )}
                    {isAvailable === true && (
                      <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 size={18} />
                        ¡La cabaña está disponible para estas fechas!
                      </div>
                    )}
                    {isAvailable === false && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-start gap-2 text-sm font-medium">
                        <X size={18} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p>La cabaña no está disponible en estas fechas.</p>
                          {conflictEnd && (
                            <p className="text-xs mt-1 opacity-80">
                              Estará disponible a partir del {format(conflictEnd, "d 'de' MMMM", { locale: es })}.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-2">WhatsApp de contacto</label>
                    <input 
                      required
                      type="tel"
                      className="w-full bg-cream border-none rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none"
                      placeholder="+57 300 000 0000"
                      value={bookingData.whatsappNumber}
                      onChange={e => setBookingData({...bookingData, whatsappNumber: e.target.value})}
                    />
                  </div>

                  <div className="flex items-start gap-3 bg-olive/5 p-4 rounded-xl border border-olive/10">
                    <div className="flex items-center h-5">
                      <input 
                        id="terms" 
                        required 
                        type="checkbox" 
                        className="w-4 h-4 text-olive border-gray-300 rounded focus:ring-olive focus:ring-2 accent-olive" 
                      />
                    </div>
                    <label htmlFor="terms" className="text-xs text-ink/70 leading-relaxed cursor-pointer">
                      Acepto las <a href="#" className="underline font-medium hover:text-olive">Políticas de Privacidad</a> y autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012 (Hábeas Data).
                    </label>
                  </div>

                  <button 
                    disabled={isSubmitting || isAvailable === false}
                    type="submit" 
                    className="w-full olive-button py-5 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Procesando...' : (
                      <>
                        <Send size={20} /> Reservar vía WhatsApp
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-ink/40 uppercase tracking-widest">
                    Al hacer clic, serás redirigido a WhatsApp
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-20 pt-16 border-t border-olive/10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="serif text-4xl text-olive">Reseñas de huéspedes</h2>
          {averageRating && (
            <div className="flex items-center gap-2">
              <Star className="fill-olive text-olive" size={28} />
              <span className="text-3xl font-bold text-olive leading-none">{averageRating}</span>
              <span className="text-ink/60 font-medium ml-1">/ 5.0</span>
            </div>
          )}
        </div>

        <form onSubmit={submitReview} className="bg-cream/30 p-8 rounded-[32px] mb-12 border border-olive/10 transform transition-all hover:shadow-lg">
          <h3 className="serif text-2xl text-olive mb-6">Deja tu reseña</h3>
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-ink/60 uppercase tracking-widest">Calificación:</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star 
                      size={28} 
                      className={`${star <= reviewForm.rating ? 'fill-olive text-olive' : 'text-olive/20'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input 
                  required
                  type="text"
                  placeholder="Tu Nombre"
                  className="w-full bg-white border border-olive/10 rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none transition-all"
                  value={reviewForm.guestName}
                  onChange={(e) => setReviewForm({ ...reviewForm, guestName: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <textarea 
                required
                placeholder="¿Cómo fue tu experiencia en la cabaña?"
                rows={4}
                className="w-full bg-white border border-olive/10 rounded-2xl p-4 focus:ring-2 focus:ring-olive/20 outline-none resize-none transition-all"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmittingReview}
              className="olive-button flex items-center justify-center gap-2 px-8 py-4 disabled:opacity-50"
            >
              {isSubmittingReview ? 'Enviando...' : 'Publicar Reseña'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          {reviews.length === 0 ? (
            <p className="text-ink/60 italic text-center py-8">Aún no hay reseñas para esta cabaña. ¡Sé el primero en dejar una!</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-olive/5 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-olive mb-1">{review.guestName}</h4>
                    <p className="text-xs text-ink/40 uppercase tracking-widest">
                      {review.createdAt?.toDate ? format(review.createdAt.toDate(), "MMMM yyyy", { locale: es }) : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={16} 
                        className={star <= review.rating ? 'fill-olive text-olive' : 'text-olive/20'} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-ink/70 leading-relaxed">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2"
          >
            <X size={32} />
          </button>
          
          <div className="relative w-full max-w-6xl px-4 flex items-center justify-center">
            {allImages.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 md:left-8 text-white/70 hover:text-white p-4 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all"
              >
                <ChevronLeft size={32} />
              </button>
            )}
            
            <img 
              src={allImages[selectedImageIndex] || `https://picsum.photos/seed/${cabin.id}/1200/1600`} 
              alt={`${cabin.name} - full size`}
              className="max-h-[85vh] max-w-full object-contain"
              referrerPolicy="no-referrer"
            />

            {allImages.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 md:right-8 text-white/70 hover:text-white p-4 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>
          
          {allImages.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 text-center text-white/70 font-medium tracking-widest text-sm">
              {selectedImageIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
