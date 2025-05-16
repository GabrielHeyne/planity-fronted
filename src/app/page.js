"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "@/utils/apiBase"; // ✅ Importación de URL centralizada
import { readFileAsData } from "@/utils/readFile";

export default function Home() {
  const [origen, setOrigen] = useState("base");
  const [cargando, setCargando] = useState(false);

  const [archivos, setArchivos] = useState({
    demanda: null,
    stock: null,
    maestro: null,
    reposiciones: null,
    stockHistorico: null,
  });

  useEffect(() => {
    const yaHayDatos = sessionStorage.getItem("demanda_limpia");
    if (yaHayDatos) setOrigen("manual");
  }, []);

  const handleArchivo = (e, tipo) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const nombre = archivo.name.toLowerCase();
    const valido =
      nombre.endsWith(".csv") || nombre.endsWith(".xlsx") || nombre.endsWith(".xls");

    if (!valido) {
      toast.warning("⚠️ Solo se permiten archivos .csv o Excel", {
        position: "top-center",
      });
      return;
    }

    setArchivos((prev) => ({ ...prev, [tipo]: archivo }));
  };

  const procesarArchivos = async () => {
    try {
      setCargando(true);

      const formData = new FormData();
      formData.append("demanda", archivos.demanda);
      formData.append("stock", archivos.stockHistorico);

      console.log("🌍 Usando API_BASE_URL:", API_BASE_URL);

      const response = await fetch(`${API_BASE_URL}/limpiar-demanda`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al limpiar la demanda");
      }

      const demandaLimpia = await response.json();
      sessionStorage.setItem("demanda_limpia", JSON.stringify(demandaLimpia));

      toast.success("Archivos procesados correctamente", {
        position: "top-center",
        className: "text-xs",
      });
    } catch (error) {
      console.error("❌ Error al procesar archivos:", error);
      toast.error("❌ Error al conectar con el backend", {
        position: "top-center",
      });
    } finally {
      setCargando(false);
    }
  };


  return (
    <main className="min-h-screen bg-white px-4 pt-2 pb-6 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <Image
          src="/banner1.png"
          alt="Banner Planity"
          width={1200}
          height={200}
          className="rounded-xl shadow-md w-full h-auto"
          priority
        />
      </div>

      <p className="text-gray-700 text-sm max-w-4xl text-center mt-4">
        Planity es una plataforma inteligente para la planificación de demanda e inventarios.
        Diseñada para ayudarte a tomar decisiones estratégicas basadas en datos reales,
        Planity automatiza procesos clave y entrega insights accionables para optimizar tus operaciones.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl w-full text-xs">
        {[
          "✅ Limpieza de Demanda",
          "📊 Forecast automático por SKU",
          "📦 Políticas de Inventario",
          "📉 Proyección de stock",
          "🧠 Simulación de escenarios",
          "🛒 Definición de compras",
          "📈 Paneles interactivos con KPIs",
          "🤖 Planificador Virtual con IA",
        ].map((texto, i) => (
          <button
            key={i}
            className="border border-gray-300 rounded-lg px-3 py-3 flex items-center justify-center text-center gap-2 hover:shadow transition"
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="mt-10 text-sm text-gray-800 max-w-lg w-full flex flex-col items-center">
        <p className="mb-4 font-medium text-center">Selecciona el origen de los datos:</p>
        <div className="flex flex-row gap-6 justify-center">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="origen"
              value="base"
              checked={origen === "base"}
              onChange={() => setOrigen("base")}
            />
            Desde Base de Datos
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="origen"
              value="manual"
              checked={origen === "manual"}
              onChange={() => setOrigen("manual")}
            />
            Carga manual de archivos
          </label>
        </div>
      </div>

      {origen === "manual" && (
        <div className="mt-6 w-full max-w-2xl bg-gray-50 border border-gray-200 p-4 rounded-md shadow-sm">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Sube tus archivos:</h3>
          {[
            { label: "Demanda histórica", key: "demanda" },
            { label: "Stock actual", key: "stock" },
            { label: "Maestro de productos", key: "maestro" },
            { label: "Reposiciones futuras", key: "reposiciones" },
            { label: "Stock histórico", key: "stockHistorico" },
          ].map(({ label, key }) => (
            <div key={key} className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleArchivo(e, key)}
                className="text-sm"
              />
              {archivos[key] && (
                <p className="text-xs text-green-600 mt-1">✔️ {archivos[key].name} listo</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🆕 Indicador visual de carga */}
      {cargando && (
        <div className="text-sm text-indigo-700 mt-6 font-medium text-center">
          ⏳ Procesando archivos... Esto puede tardar hasta 2 minutos.
        </div>
      )}

      <button
        className={`mt-8 px-6 py-2 text-white text-sm rounded-md transition ${
          origen ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300 cursor-not-allowed"
        }`}
        disabled={!origen || cargando}
        onClick={async () => {
          if (origen === "manual") {
            const faltantes = Object.entries(archivos)
              .filter(([_, file]) => !file)
              .map(([nombre]) => nombre);

            if (faltantes.includes("demanda") || faltantes.includes("stockHistorico")) {
              toast.warning("⚠️ Faltan archivos requeridos: demanda y stock histórico", {
                position: "top-center",
              });
              return;
            }

            await procesarArchivos();
          }

          if (origen === "base") {
            toast.info("🔄 En futuras versiones se conectará a la base de datos.", {
              position: "top-center",
            });
          }
        }}
      >
        {cargando ? "Procesando..." : "🚀 Comenzar planificación"}
      </button>

      <ToastContainer />
    </main>
  );
}



