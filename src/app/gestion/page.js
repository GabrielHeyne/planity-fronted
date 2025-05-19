"use client";
import { useEffect, useState } from "react";
import { ShoppingCart, Download, Filter } from "lucide-react";
import { saveAs } from "file-saver";
import { API_BASE_URL } from "@/utils/apiBase";

export default function GestionInventariosPage() {
  const [resumen, setResumen] = useState([]);
  const [detalle, setDetalle] = useState({});
  const [skuSeleccionado, setSkuSeleccionado] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("Todos");
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    try {
      const cargado = sessionStorage.getItem("politicas_inventario");
      const detalleGuardado = sessionStorage.getItem("detalle_politicas");

      const resumenParsed = cargado && cargado !== "undefined" ? JSON.parse(cargado) : null;
      const detalleParsed = detalleGuardado && detalleGuardado !== "undefined" ? JSON.parse(detalleGuardado) : null;

      if (resumenParsed && detalleParsed) {
        setResumen(resumenParsed);
        setDetalle(detalleParsed);
        setSkuSeleccionado(resumenParsed[0]?.SKU || "");
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.error("❌ Error al leer desde sessionStorage:", e);
      sessionStorage.removeItem("politicas_inventario");
      sessionStorage.removeItem("detalle_politicas");
    }

    try {
      const forecast = JSON.parse(sessionStorage.getItem("forecast") || "[]");
      const maestro = JSON.parse(sessionStorage.getItem("maestro") || "[]");
      const demanda = JSON.parse(sessionStorage.getItem("demanda_limpia") || "[]");
      const stock = JSON.parse(sessionStorage.getItem("stock_actual") || "[]");
      const repos = JSON.parse(sessionStorage.getItem("reposiciones") || "[]");

      if (!forecast.length || !maestro.length || !demanda.length || !stock.length) {
        setError("⚠️ Faltan datos esenciales para calcular inventario.");
        setIsLoading(false);
        return;
      }

      fetch(`${API_BASE_URL}/gestion_inventario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forecast, maestro, demanda_limpia: demanda, stock_actual: stock, reposiciones: repos }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);

          setResumen(data.tabla_resumen || []);
          setDetalle(data.detalles_por_sku || {});
          setKpis(data.kpis || { total_skus: 0, total_unidades: 0, total_costo: 0 });

          if (data.tabla_resumen?.length > 0) {
            setSkuSeleccionado(data.tabla_resumen[0].SKU);
          }

          sessionStorage.setItem("politicas_inventario", JSON.stringify(data.tabla_resumen));
          sessionStorage.setItem("detalle_politicas", JSON.stringify(data.detalles_por_sku));
        })
        .catch((e) => {
          console.error("❌ Error al cargar políticas:", e);
          setError("❌ Error al cargar los datos del inventario.");
        })
        .finally(() => setIsLoading(false));
    } catch (e) {
      console.error("❌ Error leyendo datos desde sessionStorage:", e);
      setError("❌ Error al procesar los datos locales.");
      setIsLoading(false);
    }
  }, []);

  const resumenFiltrado =
    filtroAccion === "Todos"
      ? resumen
      : resumen.filter((r) =>
          filtroAccion === "Comprar"
            ? r["Acción"] === "Comprar"
            : r["Acción"] === "No comprar"
        );

  const exportarCSV = () => {
    if (!resumen.length) return;
    const encabezado = Object.keys(resumen[0]).join(",");
    const filas = resumen.map((obj) => Object.values(obj).join(","));
    const contenido = [encabezado, ...filas].join("\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "gestion_inventarios.csv");
  };

  const kpi = (label, valor, color = "text-gray-800") => (
    <div className="bg-white border border-gray-300 rounded-xl px-5 py-4 text-center shadow-md">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>
        {typeof valor === "number" ? valor.toLocaleString("es-CL") : valor}
      </div>
    </div>
  );

  const detalleSKU = detalle?.[skuSeleccionado] || {};

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6 text-gray-600" />
        Gestión de Inventarios
      </h1>

      {isLoading && <p className="text-gray-500 text-sm">Cargando datos...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!isLoading && !error && (
        <>
          {/* KPIs Generales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpis && kpi("Total SKUs a Comprar", kpis.total_skus)}
            {kpis && kpi("Total Unidades a Comprar", kpis.total_unidades)}
            {kpis && kpi("Costo Total de Fabricación (€)", kpis.total_costo, "text-green-700")}
          </div>

          {/* Filtro por acción */}
          <div className="flex gap-4 items-center text-sm mt-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <span>Filtrar por acción:</span>
            <select
              className="border border-gray-300 rounded px-3 py-1 text-sm"
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="Comprar">Sólo los que se deben comprar</option>
              <option value="No comprar">Sólo los que no se deben comprar</option>
            </select>
          </div>

          {/* Tabla principal */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-500" />
                Tabla resumen por SKU
              </h2>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <Download className="w-4 h-4" /> Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <div className="max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <table className="min-w-[950px] table-fixed text-xs w-full text-center">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-[11px]">
                    <tr>
                      <th className="px-2 py-2 w-28 text-center">SKU</th>
                      <th className="px-1 py-2 w-20 text-center">Demanda</th>
                      <th className="px-1 py-2 w-20 text-center">Stock</th>
                      <th className="px-1 py-2 w-20 text-center">Repos</th>
                      <th className="px-1 py-2 w-28 text-center">Proyectado</th>
                      <th className="px-1 py-2 w-18 text-center">ROP</th>
                      <th className="px-1 py-2 w-20 text-center">Safety</th>
                      <th className="px-1 py-2 w-20 text-center">EOQ</th>
                      <th className="px-1 py-2 w-20 text-center">Costo (€)</th>
                      <th className="px-1 py-2 w-32 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenFiltrado.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 even:bg-gray-50">
                        <td className="px-2 py-1 text-center whitespace-nowrap">{row["SKU"]}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["Demanda Mensual"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["Stock Actual"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["Reposiciones"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["Stock Proyectado (5M)"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["ROP"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["Safety Stock"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["EOQ"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center">{Math.round(row["Costo Fabricación (€)"]).toLocaleString("es-CL")}</td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">{row["Acción"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Selector de SKU */}
          <div className="max-w-sm mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona un SKU:</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={skuSeleccionado}
              onChange={(e) => setSkuSeleccionado(e.target.value)}
            >
              {[...new Set(resumen.map((r) => r.SKU))].sort().map((sku) => (
                <option key={sku} value={sku}>
                  {sku}
                </option>
              ))}
            </select>
          </div>

          {/* KPIs por SKU */}
          {skuSeleccionado && detalleSKU && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kpi("Demanda mensual", detalleSKU.demanda_mensual)}
              {kpi("ROP", detalleSKU.politicas?.rop_original)}
              {kpi("Safety Stock", detalleSKU.politicas?.safety_stock)}
              {kpi("EOQ", detalleSKU.politicas?.eoq)}
              {kpi("Stock actual", detalleSKU.stock_actual)}
              {kpi("Unidades en camino", detalleSKU.unidades_en_camino)}
              {kpi("Stock simulado (5M)", detalleSKU.stock_final_simulado)}
              {kpi("Acción", detalleSKU.accion === "Comprar" ? "🛒 Comprar" : "📦 No comprar")}
              {kpi("Unidades a Comprar", detalleSKU.unidades_sugeridas)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
