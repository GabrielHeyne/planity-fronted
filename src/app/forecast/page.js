"use client";
import { useEffect, useState } from "react";
import { BarChart, CalendarClock } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { API_BASE_URL } from "@/utils/apiBase"; // ✅ URL centralizada

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ForecastPage() {
  const [forecastData, setForecastData] = useState([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("demanda_limpia");

    console.log("🌍 Usando URL:", API_BASE_URL);

    if (stored) {
      const demanda = JSON.parse(stored);
      fetch(`${API_BASE_URL}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demanda),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("📦 Forecast recibido:", data);
          setForecastData(data);
        })
        .catch((err) => console.error("❌ Error al obtener forecast:", err));
    }
  }, []);

  if (!forecastData.length) {
    return <div className="p-6 text-gray-500 text-sm">No hay datos de forecast disponibles.</div>;
  }

  const dataFiltrada = skuSeleccionado
    ? forecastData.filter((r) => r.sku === skuSeleccionado)
    : forecastData;

  const labels = dataFiltrada.map((d) => d.mes);
  const values = dataFiltrada.map((d) => d.forecast);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-800">Forecast por SKU</h1>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="block text-sm text-gray-600 mb-1">Filtrar por SKU:</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
          value={skuSeleccionado}
          onChange={(e) => setSkuSeleccionado(e.target.value)}
        >
          <option value="">— Ver todos los SKUs —</option>
          {[...new Set(forecastData.map((r) => r.sku))].sort().map((sku) => (
            <option key={sku} value={sku}>
              {sku}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-sm text-center mb-2 flex items-center justify-center gap-2">
          <CalendarClock className="w-4 h-4" /> Proyección mensual
        </h2>
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Forecast",
                data: values,
                borderColor: "#3b82f6",
                tension: 0.3,
                pointRadius: 3,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: "bottom" } },
          }}
        />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-sm mb-3">Resumen de forecast</h3>
        <table className="w-full text-sm text-center table-auto">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="py-1">SKU</th>
              <th className="py-1">Mes</th>
              <th className="py-1">Forecast</th>
            </tr>
          </thead>
          <tbody>
            {dataFiltrada.map((r, i) => (
              <tr key={i} className="border-t text-sm">
                <td className="py-1">{r.sku}</td>
                <td className="py-1">{r.mes}</td>
                <td className="py-1 font-medium">{r.forecast}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




