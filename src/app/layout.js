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
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white border-r border-gray-400 z-10">
            <Sidebar />
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 bg-white">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}







