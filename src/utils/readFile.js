export function readFileAsData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result;
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim());

      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row = {};
        headers.forEach((h, i) => {
          row[h] = isNaN(Number(values[i])) ? values[i] : Number(values[i]);
        });
        return row;
      });

      resolve(rows);
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
