"use client";
import { useEffect, useState } from "react";
import { PackageSearch, Download } from "lucide-react";
import { saveAs } from "file-saver";

export default function ResumenPage() {
  const [kpis, setKpis] = useState({});
  const [skuSeleccionado, setSkuSeleccionado] = useState("__TOTAL__");
  const [skusDisponibles, setSkusDisponibles] = useState([]);

  const getUltimasSemanas = (n) => {
    const hoy = new Date();
    const semanas = [];
    for (let i = 0; i < n; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i * 7);
      semanas.push(fecha.toISOString().slice(0, 10));
    }
    return semanas;
  };

  useEffect(() => {
    const demanda = JSON.parse(sessionStorage.getItem("demanda_limpia") || "[]");
    const maestro = JSON.parse(sessionStorage.getItem("maestro") || "[]");
    const stockHist = JSON.parse(sessionStorage.getItem("stock_historico") || "[]");
    const detalleObj = JSON.parse(sessionStorage.getItem("detalle_politicas") || "{}");
    const detalle = Object.entries(detalleObj).map(([sku, vals]) => ({ sku, ...vals }));
    const repos = JSON.parse(sessionStorage.getItem("reposiciones") || "[]");

    const skus = [...new Set(demanda.map((r) => r.sku))];
    setSkusDisponibles(skus);
    calcularKPIs("__TOTAL__", demanda, maestro, stockHist, detalle, repos);
  }, []);

  const calcularKPIs = (sku, demanda, maestro, stockHist, detalle, repos) => {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 364); // 52 semanas

    const demandaFiltrada = demanda.filter(d => {
      const fecha = new Date(d.semana);
      return fecha >= fechaLimite && (sku === "__TOTAL__" || d.sku === sku);
    });

    const maestroMap = Object.fromEntries(maestro.map(m => [m.sku, m.precio_venta]));

    let ventas12m = 0;
    let perdidas12m = 0;
    let facturacion = 0;
    let ventaPerdida = 0;

    for (const d of demandaFiltrada) {
      const precio = maestroMap[d.sku] || 0;
      ventas12m += d.demanda_original || 0;
      facturacion += (d.demanda_original || 0) * precio;
      const perdida = Math.max((d.demanda_sin_stockout || 0) - (d.demanda_original || 0), 0);
      perdidas12m += perdida;
      ventaPerdida += perdida * precio;
    }

    const tasaQuiebre = (ventas12m + perdidas12m) > 0
      ? (perdidas12m / (ventas12m + perdidas12m)) * 100
      : 0;

    const forecast = JSON.parse(sessionStorage.getItem("forecast") || "[]");
    const forecastFiltrado = forecast.filter(
      f => f.tipo_mes === "histórico" && (sku === "__TOTAL__" || f.sku === sku)
    );

    const meses = [...new Set(forecastFiltrado.map(f => f.mes))].slice(-3);
    const demandaMensual = meses.length > 0
      ? forecastFiltrado.filter(f => meses.includes(f.mes)).reduce((a, b) => a + (b.demanda_limpia || 0), 0) / meses.length
      : 0;

    const detalleFiltrado = sku === "__TOTAL__"
      ? detalle
      : detalle.filter(d => d.sku === sku);

    const stockActual = detalleFiltrado.reduce((a, b) => a + (b.stock_actual || 0), 0);
    const unidadesTransito = repos
      .filter(r => sku === "__TOTAL__" || r.sku === sku)
      .reduce((a, b) => a + (b.cantidad || 0), 0);

    const unidadesAComprar = detalleFiltrado
      .filter(d => d.accion === "Comprar")
      .reduce((a, b) => a + (b.unidades_sugeridas || 0), 0);

    const skusAComprar = sku === "__TOTAL__"
      ? [...new Set(detalle.filter(d => d.accion === "Comprar").map(d => d.sku))].length
      : detalleFiltrado.some(d => d.accion === "Comprar") ? 1 : 0;

    setKpis({
      stockActual,
      ventas12m,
      facturacion,
      unidadesTransito,
      skusAComprar,
      perdidas12m,
      ventaPerdida,
      demandaMensual: Math.round(demandaMensual),
      tasaQuiebre: tasaQuiebre.toFixed(1),
      unidadesAComprar
    });
  };

  const handleSelectSKU = (sku) => {
    setSkuSeleccionado(sku);
    const demanda = JSON.parse(sessionStorage.getItem("demanda_limpia") || "[]");
    const maestro = JSON.parse(sessionStorage.getItem("maestro") || "[]");
    const stockHist = JSON.parse(sessionStorage.getItem("stock_historico") || "[]");
    const detalleObj = JSON.parse(sessionStorage.getItem("detalle_politicas") || "{}");
    const detalle = Object.entries(detalleObj).map(([sku, vals]) => ({ sku, ...vals }));
    const repos = JSON.parse(sessionStorage.getItem("reposiciones") || "[]");
    calcularKPIs(sku, demanda, maestro, stockHist, detalle, repos);
  };

  const descargarCSV = () => {
    const csv = Object.entries(kpis)
      .map(([key, val]) => `${key},${val}`)
      .join("\n");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), "kpis_resumen.csv");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
        <PackageSearch className="w-6 h-6 text-gray-600" />
        Resumen General
      </h1>

      <div className="max-w-sm">
        <label className="block text-sm mb-1 text-gray-600">Selecciona un SKU:</label>
        <select
          value={skuSeleccionado}
          onChange={(e) => handleSelectSKU(e.target.value)}
          className="border px-4 py-2 rounded shadow-sm w-full"
        >
          <option value="__TOTAL__">Todos los SKUs</option>
          {skusDisponibles.map((sku) => (
            <option key={sku} value={sku}>{sku}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <KpiCard label="Stock Actual" value={kpis.stockActual?.toLocaleString("es-CL")} />
<KpiCard label="Unid. Vendidas (12M)" value={kpis.ventas12m?.toLocaleString("es-CL")} />
<KpiCard label="Facturación (12M)" value={`€ ${kpis.facturacion?.toLocaleString("es-CL")}`} />
<KpiCard label="Unid. en Tránsito" value={kpis.unidadesTransito?.toLocaleString("es-CL")} />
<KpiCard label="SKUs a Comprar" value={kpis.skusAComprar?.toLocaleString("es-CL")} />
<KpiCard label="Unidades Perdidas (12M)" value={kpis.perdidas12m?.toLocaleString("es-CL")} rojo />
<KpiCard label="Venta Perdida (12M)" value={`€ ${kpis.ventaPerdida?.toLocaleString("es-CL")}`} rojo />
<KpiCard label="Demanda Mensual (3M)" value={kpis.demandaMensual?.toLocaleString("es-CL")} />
<KpiCard label="Tasa de Quiebre" value={`${kpis.tasaQuiebre}%`} />
<KpiCard label="Unidades a Comprar" value={kpis.unidadesAComprar?.toLocaleString("es-CL")} />

      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={descargarCSV}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          <Download className="w-4 h-4" />
          Descargar CSV
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, rojo = false }) {
  const color = rojo ? "text-red-600" : "text-gray-800";
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>
        {value ?? "-"}
      </p>
    </div>
  );
}










