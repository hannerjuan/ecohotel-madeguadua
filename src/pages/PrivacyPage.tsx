import { useSettings } from '../context/SettingsContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function PrivacyPage() {
  usePageTitle('Política de privacidad');
  const { settings } = useSettings();
  const contact = settings.email || `WhatsApp +${settings.whatsappNumber}`;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-ink/75 leading-relaxed space-y-6">
      <h1 className="serif text-5xl text-olive mb-4">Política de tratamiento de datos personales</h1>
      <p>
        En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, {settings.hotelName} informa cómo trata los datos personales
        que recibe a través de este sitio web.
      </p>

      <h2 className="serif text-3xl text-olive pt-4">Qué datos recogemos</h2>
      <p>
        Al solicitar una reserva: nombre, número de WhatsApp, correo electrónico (opcional), número de huéspedes, fechas y notas que
        quieras compartir. Al dejar una reseña: el nombre que escribas y tu comentario, que se publican en la página de la cabaña.
      </p>

      <h2 className="serif text-3xl text-olive pt-4">Para qué los usamos</h2>
      <p>
        Para gestionar tu reserva, contactarte por WhatsApp o correo sobre tu estadía y llevar el registro de ocupación del hotel. No
        vendemos ni compartimos tus datos con terceros para fines comerciales.
      </p>

      <h2 className="serif text-3xl text-olive pt-4">Quién puede verlos</h2>
      <p>
        Solo el personal autorizado del hotel. Los datos de contacto de las reservas nunca se muestran públicamente en el sitio.
      </p>

      <h2 className="serif text-3xl text-olive pt-4">Tus derechos</h2>
      <p>
        Puedes conocer, actualizar, rectificar o pedir que eliminemos tus datos, y revocar la autorización en cualquier momento,
        escribiéndonos a {contact}.
      </p>
    </article>
  );
}
