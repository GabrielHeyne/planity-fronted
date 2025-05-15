import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Planity",
  description: "Plataforma inteligente de planificación de demanda e inventarios",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-sans bg-white">
        <Sidebar />
        <main className="ml-64 p-8 min-h-screen">{children}</main>
      </body>
    </html>
  );
}

