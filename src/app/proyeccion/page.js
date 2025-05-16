"use client";
import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
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
import {
  Download,
  BarChart,
  CalendarClock,
  TrendingDown,
} from "lucide-react";
import { saveAs } from "file-saver";
import { PackageSearch } from "lucide-react";


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function ProyeccionStockPage() {
  const [data, setData] = useState([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("__TOTAL__");
  const [filtrado, setFiltrado] = useState([]);
  const [stockHist, setStockHist] = useState([]);
  const [demandaLimpia, setDemandaLimpia] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const almacenado = sessionStorage.getItem("stock_proyectado");
      const historico = sessionStorage.getItem("stock_historico");
      const demanda = sessionStorage.getItem("demanda_limpia");

      if (almacenado) setData(JSON.parse(almacenado));
      if (historico) setStockHist(JSON.parse(historico));
      if (demanda) setDemandaLimpia(JSON.parse(demanda));
    }
  }, []);

  useEffect(() => {
    if (!data.length) return;
    if (skuSeleccionado === "__TOTAL__") {
      setFiltrado(data);
    } else {
      setFiltrado(data.filter((d) => d.sku === skuSeleccionado));
    }
  }, [skuSeleccionado, data]);

  const exportarCSV = () => {
    if (!filtrado.length) return;
    const encabezado = Object.keys(filtrado[0]).join(",");
    const filas = filtrado.map((obj) => Object.values(obj).join(","));
    const contenido = [encabezado, ...filas].join("\n");
    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `proyeccion_stock_${skuSeleccionado}.csv`);
  };

  const stockInicial =
  skuSeleccionado === "__TOTAL__"
    ? filtrado.reduce((acc, row) => acc + (row.stock_inicial_mes || 0), 0)
    : filtrado.length > 0
    ? Math.round(filtrado[0].stock_inicial_mes)
    : 0;

  const unidadesRepos = filtrado.reduce(
    (acc, row) => acc + (row.repos_aplicadas || 0),
    0
  );
  const unidadesPerdidas = filtrado.reduce(
    (acc, row) => acc + (row.unidades_perdidas || 0),
    0
  );
  const perdidaTotalEuros = filtrado.reduce(
    (acc, row) => acc + (row.perdida_proyectada_euros || 0),
    0
  );
  const forecastTotal = filtrado.reduce(
    (acc, row) => acc + (row.forecast || 0),
    0
  );
  const kpi = (label, value, color = "text-gray-800") => (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center shadow-sm">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>
        {typeof value === "number" ? value.toLocaleString("es-CL") : value}
      </div>
    </div>
  );

  const chartLine = {
    labels: [...new Set(filtrado.map((f) => f.mes))],
    datasets: [
      {
        label: "Stock Final",
        data: (() => {
          const agrupado = {};
          filtrado.forEach((f) => {
            if (!agrupado[f.mes]) agrupado[f.mes] = 0;
            agrupado[f.mes] += f.stock_final_mes || 0;
          });
          return Object.entries(agrupado)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_, v]) => v);
        })(),
        borderColor: "#2563eb",
        backgroundColor: "#2563eb20",
        tension: 0.3,
        fill: false,
      },
      {
        label: "Forecast",
        data: (() => {
          const agrupado = {};
          filtrado.forEach((f) => {
            if (!agrupado[f.mes]) agrupado[f.mes] = 0;
            agrupado[f.mes] += f.forecast || 0;
          });
          return Object.entries(agrupado)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_, v]) => v);
        })(),
        borderColor: "#f97316",
        borderDash: [5, 5],
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const chartBar = {
    labels: [...new Set(filtrado.map((f) => f.mes))],
    datasets: [
      {
        label: "Pérdida estimada (€)",
        data: (() => {
          const agrupado = {};
          filtrado.forEach((f) => {
            if (!agrupado[f.mes]) agrupado[f.mes] = 0;
            agrupado[f.mes] += f.perdida_proyectada_euros || 0;
          });
          return Object.entries(agrupado)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_, v]) => v);
        })(),
        backgroundColor: "#dc2626",
      },
    ],
  };

  const chartStockHistorico = (() => {
  const filtradoHist = stockHist.filter(
    (s) => skuSeleccionado === "__TOTAL__" || s.sku === skuSeleccionado
  );
  const agrupado = filtradoHist.reduce((acc, row) => {
    const fecha = new Date(row.fecha);
    if (isNaN(fecha)) return acc;
    const mes = fecha.toISOString().slice(0, 7);
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(Number(row.stock) || 0);
    return acc;
  }, {});
  const labels = Object.keys(agrupado).sort();
  const valores = labels.map((mes) =>
    skuSeleccionado === "__TOTAL__"
      ? agrupado[mes].reduce((a, b) => a + b, 0)
      : agrupado[mes].reduce((a, b) => a + b, 0) / agrupado[mes].length
  );
  return {
    labels,
    datasets: [
      {
        label:
          skuSeleccionado === "__TOTAL__"
            ? "Stock total mensual"
            : "Stock promedio mensual",
        data: valores,
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f620",
        tension: 0.3,
      },
    ],
  };
})();


  const chartDemanda = (() => {
    const filtradoDemanda = demandaLimpia.filter(
      (d) => skuSeleccionado === "__TOTAL__" || d.sku === skuSeleccionado
    );
    const agrupado = filtradoDemanda.reduce((acc, row) => {
      const mes = row.fecha?.slice(0, 7);
      if (!mes) return acc;
      if (!acc[mes]) acc[mes] = { real: 0, limpia: 0 };
      acc[mes].real += +row.demanda_original || 0;
      acc[mes].limpia +=
        +row.demanda_sin_outlier || +row.demanda_original || 0;
      return acc;
    }, {});
    const labels = Object.keys(agrupado).sort();
    return {
      labels,
      datasets: [
        {
          label: "Demanda Real",
          data: labels.map((m) => agrupado[m].real),
          borderColor: "#6366f1",
          backgroundColor: "#6366f120",
          tension: 0.3,
        },
        {
          label: "Demanda Limpia",
          data: labels.map((m) => agrupado[m].limpia),
          borderColor: "#10b981",
          backgroundColor: "#10b98120",
          tension: 0.3,
        },
      ],
    };
  })();

  const top10 = Object.entries(
    data.reduce((acc, row) => {
      acc[row.sku] = (acc[row.sku] || 0) + (row.perdida_proyectada_euros || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const detalle = skuSeleccionado === "__TOTAL__"
    ? data.filter((d) => d.sku === data[0]?.sku)
    : filtrado;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
  <PackageSearch className="w-6 h-6 text-gray-600" />
  Proyección de Stock
</h1>


      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpi("Stock Inicial", stockInicial)}
        {kpi("Unidades en Camino", unidadesRepos)}
        {kpi("Unidades Perdidas", unidadesPerdidas, "text-red-600")}
        {kpi("Pérdida Estimada (€)", perdidaTotalEuros, "text-red-600")}
      </div>

      {/* Selector */}
      <div className="max-w-sm">
        <label className="block text-sm text-gray-600 mb-1">Selecciona un SKU:</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
          value={skuSeleccionado}
          onChange={(e) => setSkuSeleccionado(e.target.value)}
        >
          <option value="__TOTAL__">🔍 Ver todos los SKUs</option>
          {[...new Set(data.map((d) => d.sku))].sort().map((sku) => (
            <option key={sku} value={sku}>{sku}</option>
          ))}
        </select>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
            <TrendingDown className="w-4 h-4" />
            Stock Final vs Forecast
          </div>
          <Line data={chartLine} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
            <BarChart className="w-4 h-4" />
            Pérdida Estimada en Euros
          </div>
          <Bar data={chartBar} />
        </div>
      </div>

      {/* Gráficos adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
            <PackageSearch className="w-4 h-4" />
            Stock Histórico Mensual
          </div>
          <Line data={chartStockHistorico} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
            <BarChart className="w-4 h-4" />
            Demanda Histórica Mensual
          </div>
          <Line data={chartDemanda} />
        </div>
      </div>

      {/* Top 10 SKUs con mayor pérdida */}
      <div className="bg-white p-4 rounded shadow max-w-md">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
          <TrendingDown className="w-4 h-4" />
          Top 10 SKUs con Mayor Pérdida (€)
        </div>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr>
              <th className="text-left px-2 py-1">SKU</th>
              <th className="text-right px-2 py-1">Pérdida (€)</th>
            </tr>
          </thead>
          <tbody>
            {top10.map(([sku, perdida], i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-2 py-1 text-gray-700">{sku}</td>
                <td className="px-2 py-1 text-right font-semibold text-red-600">
                  € {Math.round(perdida).toLocaleString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalle mensual */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarClock className="w-4 h-4" />
            Detalle mensual
          </div>
          <button
            onClick={exportarCSV}
            className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-auto text-sm border w-full text-center">
            <thead className="bg-gray-100">
              <tr>
                {detalle[0] &&
                  Object.keys(detalle[0]).map((key) => (
                    <th key={key} className="border px-2 py-1">{key.replaceAll("_", " ")}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {detalle.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="border px-2 py-1">
                      {typeof val === "number" ? Math.round(val).toLocaleString("es-CL") : val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}







