"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  FolderSearch,
  BarChart,
  PackageSearch,
  ShoppingCart,
  FileText,
  BrainCircuit,
} from "lucide-react";

export default function Sidebar() {
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
    <div className="w-64 fixed top-0 bottom-0 left-0 bg-white border-r border-gray-400 shadow-sm flex flex-col px-6 py-4">
  {/* Logo */}
  <div className="mb-4">
    <Image src="/planity_logo.png" alt="Logo Planity" width={220} height={80} />
  </div>

  {/* Menú */}
  <nav className="mt-4 space-y-3 flex-1">
    {menuItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 transition"
      >
        {item.icon}
        {item.label}
      </Link>
    ))}
  </nav>
</div>

  );
}
