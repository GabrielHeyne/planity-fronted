"use client";
import { useEffect, useState } from "react";
import { BarChart, CalendarClock } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function ForecastPage() {
  const [forecastData, setForecastData] = useState([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");
  const [kpis, setKpis] = useState({
    forecastProm: 0,
    forecastUpProm: 0,
    metodo: "-"
  });

  useEffect(() => {
    const forecastGuardado = sessionStorage.getItem("forecast");
    if (forecastGuardado) {
      const parsed = JSON.parse(forecastGuardado);
      setForecastData(parsed);
      if (!skuSeleccionado && parsed.length > 0) {
        setSkuSeleccionado(parsed[0].sku);
      } else {
        calcularKPIs(parsed);
      }
    }
  }, [skuSeleccionado]);

  const calcularKPIs = (datos) => {
    const filtrado = datos.filter(
      (r) =>
        r.tipo_mes === "proyección" &&
        (skuSeleccionado === "" || r.sku === skuSeleccionado)
    );
    const forecastProm =
      filtrado.slice(0, 3).reduce((sum, r) => sum + (r.forecast || 0), 0) / 3;
    const forecastUpProm =
      filtrado.slice(0, 3).reduce((sum, r) => sum + (r.forecast_up || 0), 0) / 3;
    const metodo = filtrado[0]?.metodo_forecast || "-";

    setKpis({
      forecastProm: Math.round(forecastProm),
      forecastUpProm: Math.round(forecastUpProm),
      metodo
    });
  };

  if (!forecastData.length) {
    return (
      <div className="p-6 text-gray-500 text-sm">
        No hay datos de forecast disponibles.
      </div>
    );
  }

  const dataFiltrada = forecastData.filter((r) => r.sku === skuSeleccionado);

  const labels = dataFiltrada.map((d) =>
    new Date(d.mes).toLocaleDateString("es-CL", {
      month: "short",
      year: "numeric",
    })
  );

  const demandaLimpia = dataFiltrada.map((d) =>
    d.tipo_mes === "histórico" ? Number(d.demanda_limpia) : null
  );

  const forecast = dataFiltrada.map((d) =>
    d.tipo_mes === "proyección" ? Number(d.forecast) : null
  );

  const forecastUp = dataFiltrada.map((d) =>
    d.tipo_mes === "proyección" ? Number(d.forecast_up) : null
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-800">Forecast por SKU</h1>
      </div>

      {/* Filtro SKU */}
      <div className="mb-4 max-w-sm">
        <label className="block text-sm text-gray-600 mb-1">Filtrar por SKU:</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
          value={skuSeleccionado}
          onChange={(e) => setSkuSeleccionado(e.target.value)}
        >
          {[...new Set(forecastData.map((r) => r.sku))].sort().map((sku) => (
            <option key={sku} value={sku}>
              {sku}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Forecast Promedio (3M)" value={kpis.forecastProm} />
        <KpiCard label="Forecast + Margen (3M)" value={kpis.forecastUpProm} />
        <KpiCard label="Método Seleccionado" value={kpis.metodo} />
      </div>

      {/* Gráfico */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-sm text-center mb-2 flex items-center justify-center gap-2">
          <CalendarClock className="w-4 h-4" /> Forecast vs Demanda
        </h2>
        <Line
          data={{
            labels,
            datasets: [
              {
                type: "bar",
                label: "Demanda Limpia",
                data: demandaLimpia,
                backgroundColor: "#3b82f6",
                borderRadius: 4,
                borderSkipped: false,
              },
              {
                type: "line",
                label: "Forecast proyectado",
                data: forecast,
                borderColor: "#22c55e",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "#22c55e",
                tension: 0.3,
              },
              {
                type: "line",
                label: "Forecast con Margen",
                data: forecastUp,
                borderColor: "#f97316",
                borderDash: [4, 4],
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "#f97316",
                tension: 0.3,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "top",
                labels: {
                  font: { size: 12 },
                  boxWidth: 20,
                  boxHeight: 10,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    `${ctx.dataset.label}: ${ctx.formattedValue} unidades`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: "Unidades" },
              },
              x: {
                ticks: { maxRotation: 45, minRotation: 45 },
                title: { display: true, text: "Mes" },
              },
            },
          }}
        />
      </div>

      {/* Tabla de resumen */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-sm mb-3">Resumen de forecast</h3>
        <table className="w-full text-sm text-center table-auto">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="py-1">SKU</th>
              <th className="py-1">Mes</th>
              <th className="py-1">Demanda</th>
              <th className="py-1">Demanda Limpia</th>
              <th className="py-1">Forecast</th>
              <th className="py-1">+ Margen</th>
              <th className="py-1">DPA</th>
              <th className="py-1">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {dataFiltrada.map((r, i) => (
              <tr key={i} className="text-sm">
                <td className="py-1">{r.sku}</td>
                <td className="py-1">{r.mes}</td>
                <td className="py-1">{r.demanda ?? "-"}</td>
                <td className="py-1">{r.demanda_limpia ?? "-"}</td>
                <td className="py-1 font-medium">{r.forecast ?? "-"}</td>
                <td className="py-1 text-green-600">{r.forecast_up ?? "-"}</td>
                <td className="py-1 text-indigo-600">{r.dpa_movil ?? "-"}</td>
                <td className="py-1 text-gray-500">{r.tipo_mes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-800">{value ?? "-"}</p>
    </div>
  );
}















