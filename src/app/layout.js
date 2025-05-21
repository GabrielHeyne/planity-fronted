import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Planity",
  description: "Plataforma inteligente de planificación de demanda e inventarios",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-sans bg-white min-h-screen">
        {/* Sidebar en mobile (controlado dentro del componente) */}
        <div className="md:hidden">
          <Sidebar />
        </div>

        <div className="flex">
          {/* Sidebar fijo en desktop */}
          <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white border-r border-gray-300 z-10">
            <Sidebar />
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 min-h-screen bg-white">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}










