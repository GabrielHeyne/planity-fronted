import dayjs from "dayjs";
import { percentile } from "./percentiles";

/**
 * Limpieza de demanda histórica adaptada desde Streamlit:
 * - Reemplaza valores sospechosamente bajos si hay evidencia de quiebres.
 * - Aplica corte por P95.
 * - Considera como quiebre: stock = 0, null o menor a 4.
 */
export function cleanDemand(demandaRaw, stockHist) {
  const df = demandaRaw.map((row) => ({
    ...row,
    fecha: dayjs(row.fecha),
    demanda_original: Number(row.demanda),
  }));

  const fechasUnicas = [...new Set(df.map((r) => r.fecha.format("YYYY-MM")))].sort();
  const ultimos3Meses = fechasUnicas.slice(-3);

  const result = df.map((row, _, arr) => {
    const { sku, fecha } = row;

    // Historial de ese SKU anterior a la fecha actual
    const historial = arr.filter((r) => r.sku === sku && r.fecha.isBefore(fecha));

    // ✅ Últimas 24 semanas con demanda > 0 (móvil)
    const ultimas24 = historial
      .filter((r) => r.demanda_original > 0)
      .slice(-24);

    const ultimos6Meses = historial.filter((r) =>
      r.fecha.isAfter(fecha.subtract(6, "month")) && r.demanda_original > 0
    );

    const p60 = percentile(ultimas24.map((d) => d.demanda_original), 60);
    const p15 = percentile(ultimas24.map((d) => d.demanda_original), 15);
    const p95 = percentile(ultimas24.map((d) => d.demanda_original), 95);

    let demandaLimpia = row.demanda_original;

    // Quiebres: stock <= 3 o null, y demanda = 0
    const quiebres12Meses = arr.filter(
      (r) =>
        r.sku === sku &&
        r.fecha.isBefore(fecha) &&
        r.fecha.isAfter(fecha.subtract(12, "month")) &&
        r.demanda_original === 0 &&
        stockHist.find(
          (s) =>
            s.sku === sku &&
            dayjs(s.fecha).isSame(r.fecha, "month") &&
            (s.stock === 0 || s.stock === null || s.stock < 4)
        )
    );

    const mesesQuiebre = [...new Set(quiebres12Meses.map((q) => q.fecha.format("YYYY-MM")))];
    const tiene2Quiebres = mesesQuiebre.length >= 2;

    const stockActualOAnterior = stockHist.find(
      (s) =>
        s.sku === sku &&
        (
          dayjs(s.fecha).isSame(fecha, "month") ||
          dayjs(s.fecha).isSame(fecha.subtract(1, "month"), "month")
        ) &&
        (s.stock === 0 || s.stock === null || s.stock < 4)
    );

    const stockFuturo = stockHist.find(
      (s) => s.sku === sku && dayjs(s.fecha).isAfter(fecha) && s.stock >= 4
    );

    const estaEnUltimos3Meses = ultimos3Meses.includes(fecha.format("YYYY-MM"));
    const huboDemandaReciente = ultimos6Meses.length > 0;

    const criterio1 = row.demanda_original < p15;
    const criterio2 =
      tiene2Quiebres ||
      (stockActualOAnterior && (stockFuturo || estaEnUltimos3Meses));

    if (criterio1 && criterio2 && huboDemandaReciente) {
      demandaLimpia = p60;
    }

    // Corte superior
    if (demandaLimpia > p95 && p95 > 0) {
      demandaLimpia = p95;
    }

    return {
      ...row,
      demanda_sin_stockout: row.demanda_original,
      demanda_sin_outlier: Math.round(demandaLimpia),
    };
  });

  // Guardar en sessionStorage
  sessionStorage.setItem("demanda_limpia", JSON.stringify(result));
  return result;
}



