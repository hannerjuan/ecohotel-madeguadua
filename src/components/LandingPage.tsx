import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Cabin, Activity } from '../types';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, ArrowRight, Waves, Trees, Anchor, MessageCircle, Coffee, Utensils, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';

// Fix Leaflet's default marker icon issue in React
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function LandingPage() {
  const [featuredCabins, setFeaturedCabins] = useState<Cabin[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentBg, setCurrentBg] = useState(0);

  const heroImages = [
    "https://scontent.fpei2-1.fna.fbcdn.net/v/t39.30808-6/635440638_122158792070827352_7542932175184495619_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeFm3IchCtg7IDHdfNVScyjBng_GzDeHB46eD8bMN4cHjsYqaLUVeun3HSSUIvcxs4ucNbdvnzzuzjlz_B4tJDpj&_nc_ohc=kc8niT4V7-UQ7kNvwEgFHzz&_nc_oc=AdrPaSMOYMWME64y9U6OVKyRfl5yZfVhWOXZeTL6_EL5GzoiGGSHng_tJSerp5taYYg&_nc_zt=23&_nc_ht=scontent.fpei2-1.fna&_nc_gid=aRbD2k0usk8kMTs_GaPktw&_nc_ss=7a3a8&oh=00_Af20FzrLXBPpuTpNLW_XSF28-Rg3K-KVIvygdOuum_eu-A&oe=69D8CE60",
    "https://scontent.fpei2-1.fna.fbcdn.net/v/t39.30808-6/634340954_122158792406827352_8583168216529289032_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeFVc_Ho-wiKH5575RmPWCHzgYoy6iJ0csqBijLqInRyyjSTh7F2VekCZVrJeTRNtsnlvXYFuup-_iHiYmHg0joR&_nc_ohc=NLP237CMIGYQ7kNvwH1_Gux&_nc_oc=AdrFxTWJmuZMKD3shcOjXX8U2gFOYq6rRr0RG4InfnfBtYlrABPs0a2x0uTiJCzpWWc&_nc_zt=23&_nc_ht=scontent.fpei2-1.fna&_nc_gid=VAbWxM8EPMKmAPkdl6-Ebg&_nc_ss=7a3a8&oh=00_Af3x9YfKfz1R6aT9R5kNvNqO9dQ_Pb7YnMVvJm_W2OwW9Q&oe=69D8A756",
    "https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544253915-0810168cb729?auto=format&fit=crop&q=80"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const qCabins = query(collection(db, 'cabins'), limit(3));
    const unsubscribeCabins = onSnapshot(qCabins, (snapshot) => {
      setFeaturedCabins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cabin[]);
    });

    const qActivities = query(collection(db, 'activities'), limit(4));
    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Activity[]);
    });

    return () => {
      unsubscribeCabins();
      unsubscribeActivities();
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section - Optimized Slider */}
      <section className="relative h-[85vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroImages.map((img, idx) => (
            <motion.img
              key={idx}
              src={img}
              initial={{ opacity: 0, scale: 1 }}
              animate={{ 
                opacity: currentBg === idx ? 1 : 0,
                scale: currentBg === idx ? 1.08 : 1,
                transition: { 
                  opacity: { duration: 1.5, ease: "easeInOut" },
                  scale: { duration: 8, ease: "linear" } 
                }
              }}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ))}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <h1 className="serif text-4xl sm:text-6xl md:text-8xl text-white mb-4 sm:mb-6 leading-tight drop-shadow-2xl">
              UN REFUGIO EN EL BOSQUE <br />
              <span className="text-xl sm:text-2xl md:text-4xl italic font-light text-white/90 block mt-4 px-4 drop-shadow-lg">
                En el corazón de Norcasia, Caldas. Junto al majestuoso Río La Miel.
              </span>
            </h1>
            
            <motion.div 
              className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Link to="/cabins" className="olive-button py-4 px-10 text-lg w-full sm:w-auto shadow-2xl hover:-translate-y-1 transition-transform">
                DESCUBRE LAS CABAÑAS
              </Link>
              <a href="#about" className="px-8 py-4 text-white border border-white/50 rounded-full backdrop-blur-md hover:bg-white/20 transition-all text-sm uppercase tracking-widest font-medium w-full sm:w-auto hover:-translate-y-1">
                Saber más
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Pro Slider Pagination Indicators */}
        <div className="absolute bottom-16 sm:bottom-20 flex gap-4 z-20 left-1/2 -translate-x-1/2">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBg(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out focus:outline-none ${
                currentBg === idx ? 'w-10 bg-white' : 'w-3 bg-white/40 hover:bg-white/80'
              }`}
              aria-label={`Ir a la imagen ${idx + 1}`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/50"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/70 to-transparent"></div>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <img 
                src="https://scontent.fpei2-1.fna.fbcdn.net/v/t39.30808-6/634340954_122158792406827352_8583168216529289032_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeFVc_Ho-wiKH5575RmPWCHzgYoy6iJ0csqBijLqInRyyjSTh7F2VekCZVrJeTRNtsnlvXYFuup-_iHiYmHg0joR&_nc_ohc=NLP237CMIGYQ7kNvwH1_Gux&_nc_oc=AdrFxTWJmuZMKD3shcOjXX8U2gFOYq6rRr0RG4InfnfBtYlrABPs0a2x0uTiJCzpWWc&_nc_zt=23&_nc_ht=scontent.fpei2-1.fna&_nc_gid=VAbWxM8EPMKmAPkdl6-Ebg&_nc_ss=7a3a8&oh=00_Af3x9YfKfz1R6aT9R5kNvNqO9dQ_Pb7YnMVvJm_W2OwW9Q&oe=69D8A756" 
                alt="Río La Miel" 
                className="pill-image w-full h-[600px] shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                className="absolute -bottom-10 -right-10 bg-olive text-white p-12 rounded-[40px] hidden md:block max-w-xs shadow-xl"
              >
                <Waves className="mb-4" size={32} />
                <h3 className="serif text-2xl mb-2">Aguas Cristalinas</h3>
                <p className="text-sm opacity-80 font-light">El Río La Miel ofrece uno de los paisajes más puros de Colombia.</p>
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-olive font-bold tracking-[0.2em] text-sm uppercase mb-4 block">Descubre Norcasia</span>
              <h2 className="serif text-5xl md:text-6xl text-olive mb-8 leading-tight">EcoHotel Madeguadua en el corazón de Caldas</h2>
              <p className="text-ink/70 text-lg leading-relaxed mb-8">
                Ubicados en Norcasia, Caldas, somos el portal a una de las maravillas naturales más impresionantes de Colombia: el Río La Miel. 
                Nuestras cabañas construidas en bambú y guadua se integran perfectamente con el bosque tropical, ofreciendo una experiencia de lujo sostenible.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="flex items-start gap-4">
                  <div className="bg-olive/10 p-3 rounded-2xl text-olive"><Trees /></div>
                  <div>
                    <h4 className="font-bold text-olive">100% Sostenible</h4>
                    <p className="text-sm text-ink/50">Construcción ecológica</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-olive/10 p-3 rounded-2xl text-olive"><Anchor /></div>
                  <div>
                    <h4 className="font-bold text-olive">Aventura</h4>
                    <p className="text-sm text-ink/50">Tours en lancha y pesca</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Cabins */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-end mb-16"
          >
            <div>
              <span className="text-olive font-bold tracking-[0.2em] text-sm uppercase mb-4 block">Tu Estancia</span>
              <h2 className="serif text-5xl text-olive">Cabañas de Ensueño</h2>
            </div>
            <Link to="/cabins" className="text-olive font-bold flex items-center gap-2 hover:underline">
              Ver todas <ArrowRight size={20} />
            </Link>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {featuredCabins.map((cabin, index) => (
              <motion.div
                key={cabin.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <Link to={`/cabin/${cabin.id}`} className="group">
                  <div className="card overflow-hidden h-full flex flex-col transition-all duration-500 hover:shadow-2xl">
                    <div className="h-80 overflow-hidden">
                      <img 
                        src={cabin.imageUrl || `https://picsum.photos/seed/${cabin.id}/800/1000`} 
                        alt={cabin.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-8">
                      <h3 className="serif text-2xl text-olive mb-2">{cabin.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-ink/50">
                        <span className="flex items-center gap-1"><Users size={14} /> {cabin.capacity} Pers.</span>
                        <span className="font-bold text-olive">${cabin.price.toLocaleString()} / noche</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gastronomy Section (Farm to Table Concept) */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-olive font-bold tracking-[0.2em] text-sm uppercase mb-4 block">Del Campo a la Mesa</span>
              <h2 className="serif text-5xl md:text-6xl text-olive mb-6 leading-tight">Gastronomía Sostenible</h2>
              <p className="text-ink/70 text-lg leading-relaxed mb-8">
                Nuestro restaurante fusiona la tradición culinaria colombiana con técnicas modernas, utilizando ingredientes frescos cultivados en nuestra propia huerta orgánica o por agricultores locales de Norcasia.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-cream p-3 rounded-full text-olive"><Utensils size={24} /></div>
                  <div>
                    <h4 className="font-bold text-olive text-xl mb-1">Menú Degustación</h4>
                    <p className="text-sm text-ink/70">Un viaje de 5 tiempos por los sabores del Magdalena Medio.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-cream p-3 rounded-full text-olive"><Coffee size={24} /></div>
                  <div>
                    <h4 className="font-bold text-olive text-xl mb-1">Café de Origen Especial</h4>
                    <p className="text-sm text-ink/70">Tostado en casa. El despertar perfecto frente al río.</p>
                  </div>
                </div>
              </div>
              
              <button className="mt-10 olive-button px-8 py-4">Ver Menú Completo</button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative h-[600px] grid grid-cols-2 gap-4"
            >
              <img 
                src="https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&q=80" 
                alt="Platillo típico del río" 
                className="w-full h-full object-cover rounded-3xl mt-12 shadow-xl"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80" 
                alt="Bebida de Cacao o Café" 
                className="w-full h-full object-cover rounded-3xl -mt-4 shadow-xl"
                referrerPolicy="no-referrer"
              />
              
              {/* Floating Badge */}
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-full shadow-2xl flex flex-col items-center justify-center w-36 h-36 border-4 border-cream"
              >
                <span className="serif text-3xl text-olive block mb-1">100%</span>
                <span className="text-[10px] uppercase tracking-widest text-ink/50 text-center font-bold">Local & de Río</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-olive text-white overflow-hidden relative">
        {/* Subtle patterned background overlay could go here */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-cream font-bold tracking-[0.2em] text-sm uppercase mb-4 block">Testimonios</span>
            <h2 className="serif text-5xl text-white">Memorias de nuestros Huéspedes</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Camila Ruiz",
                date: "Octubre 2025",
                text: "El diseño de las cabañas de guadua es espectacular. Despertar con el sonido de los pájaros y tener el Río La Miel ahí mismo fue una experiencia de otro nivel.",
                rating: 5
              },
              {
                name: "Fernando y Laura",
                date: "Enero 2026",
                text: "La atención al detalle en este hotel boutique es increíble. La comida del restaurante nos sorprendió gratamente. Definitivamente volveremos para nuestro aniversario.",
                rating: 5
              },
              {
                name: "Santiago H.",
                date: "Marzo 2026",
                text: "El tour por el río y las cascadas estuvo muy bien organizado. Las instalaciones son de lujo pero se sienten muy orgánicas con el entorno. Un escape perfecto.",
                rating: 5
              }
            ].map((review, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20"
              >
                <div className="flex gap-1 text-cream mb-6">
                  {[...Array(review.rating)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                </div>
                <p className="text-white/90 italic mb-8 line-clamp-4 leading-relaxed">
                  "{review.text}"
                </p>
                <div className="flex items-center justify-between border-t border-white/20 pt-4">
                  <span className="font-bold">{review.name}</span>
                  <span className="text-xs text-white/50 uppercase tracking-widest">{review.date}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-olive font-bold tracking-[0.2em] text-sm uppercase mb-4 block">Experiencias</span>
            <h2 className="serif text-5xl text-olive">Actividades y Aventuras</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {activities.map((activity, index) => (
              <motion.div 
                key={activity.id} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="relative h-[450px] rounded-[32px] overflow-hidden shadow-lg">
                  <img 
                    src={activity.imageUrl || `https://picsum.photos/seed/${activity.id}/600/900`} 
                    alt={activity.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                    <h3 className="serif text-2xl text-white mb-2">{activity.name}</h3>
                    <p className="text-white/70 text-sm line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-white/90 text-xs font-bold uppercase tracking-widest">{activity.duration}</span>
                      {activity.cost > 0 && <span className="text-white font-bold">${activity.cost.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-cream overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
            <div className="lg:col-span-1">
              <h2 className="serif text-5xl text-olive mb-8">Ubicación del Hotel</h2>
              <p className="text-ink/70 text-lg mb-8">
                Estamos ubicados en el municipio de Norcasia, Caldas. Un destino emergente rodeado de selva tropical y ríos de aguas esmeralda.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-olive text-white p-3 rounded-full"><MapPin size={20} /></div>
                  <div>
                    <h4 className="font-bold text-olive">Dirección</h4>
                    <p className="text-sm text-ink/50">Vereda La Miel, Norcasia, Caldas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-olive text-white p-3 rounded-full"><Calendar size={20} /></div>
                  <div>
                    <h4 className="font-bold text-olive">Cómo llegar</h4>
                    <p className="text-sm text-ink/50">A 5 horas de Bogotá o Medellín</p>
                  </div>
                </div>
              </div>
              <a 
                href="https://maps.google.com/?q=Norcasia+Caldas+Rio+La+Miel" 
                target="_blank" 
                className="mt-12 inline-flex items-center gap-2 font-bold text-olive hover:underline"
              >
                Abrir en Google Maps <ArrowRight size={20} />
              </a>
            </div>
            
            <div className="lg:col-span-2 h-[500px] rounded-[40px] overflow-hidden shadow-2xl border-8 border-white relative z-0">
              <MapContainer 
                center={[5.5786, -74.8943]} 
                zoom={14} 
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Main Hotel Marker */}
                <Marker position={[5.5786, -74.8943]}>
                  <Popup>
                    <div className="text-center">
                      <strong className="text-olive block mb-1">EcoHotel Madeguadua</strong>
                      <span className="text-xs text-ink/70">Recepción Principal</span>
                    </div>
                  </Popup>
                </Marker>

                {/* Featured Cabins Markers (Simulated locations around the main hotel) */}
                {featuredCabins.map((cabin, index) => {
                  // Simulate slightly different coordinates to spread them around the map
                  const latOffset = (index % 2 === 0 ? 1 : -1) * (0.003 + (index * 0.001));
                  const lngOffset = (index % 3 === 0 ? 1 : -1) * (0.004 + (index * 0.001));
                  const position: [number, number] = [5.5786 + latOffset, -74.8943 + lngOffset];

                  return (
                    <Marker key={cabin.id} position={position}>
                      <Popup>
                        <div className="max-w-[200px]">
                          <img 
                            src={cabin.imageUrl || `https://picsum.photos/seed/${cabin.id}/400/300`} 
                            alt={cabin.name} 
                            className="w-full h-24 object-cover rounded-xl mb-3"
                          />
                          <strong className="text-olive block text-sm mb-1">{cabin.name}</strong>
                          <p className="text-xs text-ink/70 line-clamp-2 mb-2">{cabin.description}</p>
                          <Link 
                            to={`/cabin/${cabin.id}`} 
                            className="text-xs font-bold text-olive hover:underline flex items-center gap-1"
                          >
                            Ver cabaña <ArrowRight size={12} />
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
