"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "@/utils/apiBase";


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
      toast.warning("Solo se permiten archivos .csv o Excel", {
        position: "top-center",
      });
      return;
    }

    setArchivos((prev) => ({ ...prev, [tipo]: archivo }));
  };

  const readerAsync = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);
        const keys = rows[0].split(",").map((k) => k.trim().toLowerCase());
        const data = rows.slice(1).map((row) => {
          const values = row.split(",").map((v) => v.trim());
          return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
        });
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });

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

      if (!response.ok) throw new Error("Error al limpiar la demanda");

      const demandaLimpia = await response.json();
      sessionStorage.setItem("demanda_limpia", JSON.stringify(demandaLimpia));

      const datosForecast = demandaLimpia.map((fila) => ({
        sku: fila.sku,
        fecha: fila.fecha,
        demanda: fila.demanda ?? fila.demanda_sin_outlier ?? 0,
        demanda_sin_outlier: fila.demanda_sin_outlier ?? fila.demanda ?? 0,
      }));

      const resForecast = await fetch(`${API_BASE_URL}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosForecast),
      });

      if (!resForecast.ok) throw new Error("Error al calcular forecast");

      const resultadoForecast = await resForecast.json();
      sessionStorage.setItem("forecast", JSON.stringify(resultadoForecast.forecast || []));

      // Leer y guardar maestro, stock y reposiciones
      const maestro = await readerAsync(archivos.maestro);
const reposiciones = await readerAsync(archivos.reposiciones);
const stock_actual = await readerAsync(archivos.stock);
const stock_historico = await readerAsync(archivos.stockHistorico);

const stock_historico_limpio = stock_historico.map((row) => ({
  sku: row.sku,
  fecha: row.fecha,
  stock: parseFloat(row.stock) || 0,
}));

sessionStorage.setItem("maestro", JSON.stringify(maestro));
sessionStorage.setItem("reposiciones", JSON.stringify(reposiciones));
sessionStorage.setItem("stock_actual", JSON.stringify(stock_actual));
sessionStorage.setItem("stock_historico", JSON.stringify(stock_historico_limpio));

      const resStock = await fetch(`${API_BASE_URL}/proyeccion-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecast: resultadoForecast.forecast,
          stock_actual,
          reposiciones,
          maestro,
        }),
      });

      if (!resStock.ok) throw new Error("Error al proyectar stock");

      const resultadoStock = await resStock.json();
      sessionStorage.setItem("stock_proyectado", JSON.stringify(resultadoStock));

      toast.success("Todo listo: Forecast y proyección generados", {
        position: "top-center",
        className: "text-xs",
      });
    } catch (error) {
      console.error("❌ Error al procesar archivos:", error);
      toast.error("Error al conectar con el backend", {
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
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="origen"
        value="cloud"
        checked={origen === "cloud"}
        onChange={() => setOrigen("cloud")}
      />
      Cargar desde la nube
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
      toast.warning("Faltan archivos requeridos: demanda y stock histórico", {
        position: "top-center",
      });
      return;
    }

    await procesarArchivos();
  }

  if (origen === "cloud") {
    try {
      setCargando(true);
      const res = await fetch(`${API_BASE_URL}/cloud/cargar_desde_nube`);
      if (!res.ok) throw new Error("Error al cargar desde la nube");

      const data = await res.json();
      sessionStorage.setItem("demanda_limpia", JSON.stringify(data.demanda_limpia));
      sessionStorage.setItem("forecast", JSON.stringify(data.forecast));
      sessionStorage.setItem("maestro", JSON.stringify(data.maestro));
      sessionStorage.setItem("reposiciones", JSON.stringify(data.reposiciones));
      sessionStorage.setItem("stock_actual", JSON.stringify(data.stock_actual));
      sessionStorage.setItem("stock_historico", JSON.stringify(data.stock_historico));
      sessionStorage.setItem("stock_proyectado", JSON.stringify(data.stock_proyectado));

      toast.success("✅ Datos cargados desde la nube correctamente", {
        position: "top-center",
      });
    } catch (err) {
      console.error("❌ Error carga nube:", err);
      toast.error("Error al cargar desde la nube", {
        position: "top-center",
      });
    } finally {
      setCargando(false);
    }
  }

  if (origen === "base") {
    toast.info("En futuras versiones se conectará a la base de datos.", {
      position: "top-center",
    });
  }
}}

      >
        {cargando ? "Procesando..." : "🚀 Comenzar planificación"}
      </button>

      <ToastContainer
        position="top-center"
        className="text-xs"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        progressClassName="!bg-green-500"
      />
    </main>
  );
}

