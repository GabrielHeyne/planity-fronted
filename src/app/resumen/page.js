"use client";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { API_BASE_URL } from "@/utils/apiBase";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ResumenPage() {
  const [data, setData] = useState(null);
  const [skuSeleccionado, setSkuSeleccionado] = useState("__TOTAL__");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const demanda_limpia = JSON.parse(sessionStorage.getItem("demanda_limpia") || "[]");
    const forecast = JSON.parse(sessionStorage.getItem("forecast") || "[]");
    const stock_actual = JSON.parse(sessionStorage.getItem("stock_actual") || "[]");
    const reposiciones = JSON.parse(sessionStorage.getItem("reposiciones") || "[]");
    const maestro = JSON.parse(sessionStorage.getItem("maestro") || "[]");
    const stock_historico = JSON.parse(sessionStorage.getItem("stock_historico") || "[]");
    const detalle_politicas = JSON.parse(sessionStorage.getItem("detalle_politicas") || "{}");

    fetch(`${API_BASE_URL}/resumen-general`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        demanda_limpia,
        forecast,
        stock_actual,
        reposiciones,
        maestro,
        stock_historico,
        politicas_inventario: [],
        detalle_politicas,
      }),
    })
      .then((res) => res.json())
      .then((resumen) => {
        setData(resumen);
      })
      .catch((err) => {
        console.error("❌ Error cargando resumen general:", err);
        setError("❌ Error cargando datos del resumen.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-6 text-center text-gray-500">⏳ Cargando resumen general...</div>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!data) return null;

  const historico = data.historico || [];
  const contexto = data.contexto_por_sku || [];
  const contexto_global = data.contexto_global || {};
  const skus = [...new Set(contexto.map((r) => r.SKU))];
  const contextoSKU = skuSeleccionado === "__TOTAL__" ? null : contexto.find((r) => r.SKU === skuSeleccionado);
  const historicoFiltrado = skuSeleccionado === "__TOTAL__"
    ? historico
    : historico.filter(r => r.sku === skuSeleccionado);

  const kpiCard = (label, value, color = "text-gray-800") => (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center shadow-sm">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>
        {typeof value === "number" ? value.toLocaleString("es-CL") : value}
      </div>
    </div>
  );

  const descargarCSV = () => {
    const rows = contexto;
    const csv = [Object.keys(rows[0]).join(","), ...rows.map(r => Object.values(r).join(","))].join("\n");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `resumen_por_sku.csv`);
  };

  const topPerdidas = [...contexto].sort((a, b) => b["Unidades a Comprar"] - a["Unidades a Comprar"]).slice(0, 10);
  const topVentas = [...contexto].sort((a, b) => b["Demanda Mensual (3M)"] - a["Demanda Mensual (3M)"]).slice(0, 10);

const demandaFiltrada = data.demanda_limpia?.filter((d) =>
  skuSeleccionado === "__TOTAL__" || d.sku === skuSeleccionado
) || [];

const agrupadoSemanal = {};
const agrupadoMensual = {};
demandaFiltrada.forEach((d) => {
  const fecha = new Date(d.fecha);
  const semana = new Date(fecha.setDate(fecha.getDate() - fecha.getDay())).toISOString().slice(0, 10);
  const mes = d.fecha?.slice(0, 7);

  const real = +d.demanda_original || 0;
  const limpia = +d.demanda_sin_outlier || +d.demanda_original || 0;

  if (semana) {
    if (!agrupadoSemanal[semana]) agrupadoSemanal[semana] = { real: 0, limpia: 0 };
    agrupadoSemanal[semana].real += real;
    agrupadoSemanal[semana].limpia += limpia;
  }

  if (mes) {
    if (!agrupadoMensual[mes]) agrupadoMensual[mes] = { real: 0, limpia: 0 };
    agrupadoMensual[mes].real += real;
    agrupadoMensual[mes].limpia += limpia;
  }
});

const semanas = Object.keys(agrupadoSemanal).sort();
const meses = Object.keys(agrupadoMensual).sort();

const chartSemanal = {
  labels: semanas,
  datasets: [
    {
      label: "Demanda Real",
      data: semanas.map((s) => agrupadoSemanal[s].real),
      borderColor: "#3b82f6",
      backgroundColor: "#3b82f620",
      tension: 0.3,
    },
    {
      label: "Demanda Limpia",
      data: semanas.map((s) => agrupadoSemanal[s].limpia),
      borderColor: "#22c55e",
      backgroundColor: "#22c55e20",
      tension: 0.3,
    },
  ],
};

const chartMensual = {
  labels: meses,
  datasets: [
    {
      label: "Demanda Real",
      data: meses.map((m) => agrupadoMensual[m].real),
      borderColor: "#3b82f6",
      backgroundColor: "#3b82f620",
      tension: 0.3,
    },
    {
      label: "Demanda Limpia",
      data: meses.map((m) => agrupadoMensual[m].limpia),
      borderColor: "#22c55e",
      backgroundColor: "#22c55e20",
      tension: 0.3,
    },
  ],
};



  return (
  <div className="p-6 space-y-8">
    <h1 className="text-2xl font-semibold text-gray-800">Resumen General</h1>

    {/* Selector de SKU */}
    <div className="max-w-sm">
      <label className="block text-sm mb-1 text-gray-600">Selecciona un SKU:</label>
      <select
        className="w-full border px-4 py-2 rounded shadow-sm"
        value={skuSeleccionado}
        onChange={(e) => setSkuSeleccionado(e.target.value)}
      >
        <option value="__TOTAL__">Todos los SKUs</option>
        {skus.map((sku) => (
          <option key={sku} value={sku}>
            {sku}
          </option>
        ))}
      </select>
    </div>

    {/* KPIs Globales o por SKU */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {skuSeleccionado === "__TOTAL__" ? (
        <>
          {kpiCard("Stock Actual", contexto_global["Stock Actual"] ?? 0)}
          {kpiCard("Unid. Vendidas (12M)", contexto_global["Unid. Vendidas (12M)"] ?? 0)}
          {kpiCard("Facturación (12M)", `€ ${(contexto_global["Facturación (12M)"] ?? 0).toLocaleString("es-CL")}`)}
          {kpiCard("Unid. en Tránsito", contexto_global["Unid. en Camino"] ?? 0)}
          {kpiCard("SKUs a Comprar", contexto_global["SKUs a Comprar"] ?? 0)}
          {kpiCard("Unidades Perdidas (12M)", contexto_global["Unidades Perdidas (12M)"] ?? 0, "text-red-600")}
          {kpiCard("Venta Perdida (12M)", `€ ${(contexto_global["Venta Perdida (12M)"] ?? 0).toLocaleString("es-CL")}`, "text-red-600")}
          {kpiCard("Demanda Mensual (3M)", contexto_global["Demanda Mensual (3M)"] ?? 0)}
          {kpiCard("Tasa de Quiebre", `${contexto_global["Tasa de Quiebre"] ?? 0}%`)}
          {kpiCard("Unidades a Comprar", contexto_global["Unidades a Comprar"] ?? 0)}
        </>
      ) : (
        <>
          {kpiCard("Stock Actual", contextoSKU["Stock Actual"] ?? 0)}
          {kpiCard("Unid. Vendidas (12M)", contextoSKU["Unid. Vendidas (12M)"] ?? 0)}
          {kpiCard("Facturación (12M)", `€ ${(contextoSKU["Facturación (12M)"] ?? 0).toLocaleString("es-CL")}`)}
          {kpiCard("Unid. en Tránsito", contextoSKU["Unidades en Camino"] ?? 0)}
          {kpiCard("¿Comprar este SKU?", contextoSKU["¿Comprar este SKU?"] ?? "No")}
          {kpiCard("Unidades Perdidas (12M)", contextoSKU["Unidades Perdidas (12M)"] ?? 0, "text-red-600")}
          {kpiCard("Venta Perdida (12M)", `€ ${(contextoSKU["Venta Perdida (12M)"] ?? 0).toLocaleString("es-CL")}`, "text-red-600")}
          {kpiCard("Demanda Mensual (3M)", contextoSKU["Demanda Mensual (3M)"] ?? 0)}
          {kpiCard("Tasa de Quiebre", `${contextoSKU["Tasa de Quiebre"] ?? 0}%`)}
          {kpiCard("Unidades a Comprar", contextoSKU["Unidades a Comprar"] ?? 0)}
        </>
      )}
    </div>
  </div>
);
}          // <- cierra la función ResumenPage
