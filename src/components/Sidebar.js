"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Home,
  FolderSearch,
  BarChart,
  PackageSearch,
  ShoppingCart,
  FileText,
  BrainCircuit,
  Menu,
  X
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const menuItems = [
    { href: "/", label: "Inicio", icon: <Home size={18} /> },
    { href: "/demanda", label: "Demanda Total", icon: <FolderSearch size={18} /> },
    { href: "/forecast", label: "Forecast", icon: <BarChart size={18} /> },
    { href: "/proyeccion", label: "Proyección Stock", icon: <PackageSearch size={18} /> },
    { href: "/gestion", label: "Gestión Inventarios", icon: <ShoppingCart size={18} /> },
    { href: "/resumen", label: "Resumen General", icon: <FileText size={18} /> },
    { href: "/ia", label: "IA Planificador Virtual", icon: <BrainCircuit size={18} /> },
  ];

  return (
    <>
      {/* Botón hamburguesa en móvil */}
      <button
        onClick={toggleSidebar}
        className="md:hidden p-4 fixed top-0 left-0 z-50"
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Fondo oscuro en mobile cuando el sidebar está abierto */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-30 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 bottom-0 bg-white border-r border-gray-300 flex flex-col px-6 py-4 w-64 z-40 transition-transform duration-300 ease-in-out
  ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
      >
        <div className="mb-4">
          <Image src="/planity_logo.png" alt="Logo Planity" width={220} height={80} />
        </div>
        <nav className="mt-4 space-y-3 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 transition"
              onClick={() => setIsOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}


