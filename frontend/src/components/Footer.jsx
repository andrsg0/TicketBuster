import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-10 mt-auto">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo & Description */}
          <div>
            <Link to="/" className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" className="w-16 h-16 fill-white">
                <path d="M 9 16 C 6.8026661 16 5 17.802666 5 20 L 5 60 C 5 62.197334 6.8026661 64 9 64 L 51 64 C 52.210938 64 53.264444 63.423754 54 62.564453 C 54.735556 63.423754 55.789062 64 57 64 L 71 64 C 73.197334 64 75 62.197334 75 60 L 75 20 C 75 17.802666 73.197334 16 71 16 L 57 16 C 55.789062 16 54.735556 16.576246 54 17.435547 C 53.264444 16.576246 52.210938 16 51 16 L 9 16 z" />
              </svg>
            </Link>
            <p className="text-gray-dark text-sm">
              Sistema de venta de tickets con soporte offline. Compra tus entradas de forma segura.
            </p>
          </div>

          {/* Navigation Links (existing routes only) */}
          <div>
            <h4 className="font-semibold mb-4">Navegación</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-dark hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-gray-dark hover:text-white transition-colors">
                  Eventos
                </Link>
              </li>
              <li>
                <Link to="/my-tickets" className="text-gray-dark hover:text-white transition-colors">
                  Mis Tickets
                </Link>
              </li>
            </ul>
          </div>

          {/* Minimal Info */}
          <div>
            <h4 className="font-semibold mb-4">Información</h4>
            <p className="text-gray-dark text-sm">
              TicketBuster es un proyecto demo. Algunas funciones pueden estar en desarrollo.
            </p>
          </div>

          {/* Removed non-existent links */}
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-dark/30 pt-6 text-center">
          <p className="text-gray-dark text-sm">
            &copy; {new Date().getFullYear()} TicketBuster. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
