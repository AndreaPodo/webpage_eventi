/* Event data loader
 * Restituisce sempre eventi normalizzati:
 * { date: "YYYY-MM-DD", title, theater, link, price, visible }
 */
(function (global) {
  "use strict";

  const TEXT_FILE = "./spettacoli.txt";
  const LEGACY_XLSX_FILE = "./spettacoli.xlsx";

  function parseDelimited(source, delimiter = ";") {
    const rows = [];
    let row = [], field = "", quoted = false;

    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"' && source[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[i + 1] === "\n") i++;
        row.push(field);
        if (row.some(value => value.trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    row.push(field);
    if (row.some(value => value.trim() !== "")) rows.push(row);
    return rows;
  }

  function normalizeDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return toIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    const input = String(value ?? "").trim();
    let match = input.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) return toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));

    match = input.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));

    return "";
  }

  function toIsoDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
    return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  }

  function headerIndex(headers, name) {
    return headers.findIndex(value => String(value).trim().toLocaleLowerCase("it") === name.toLocaleLowerCase("it"));
  }

  function normalizeRows(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(value => String(value).replace(/^\uFEFF/, "").trim());
    const indexes = {
      date: headerIndex(headers, "Giorno"),
      title: headerIndex(headers, "Titolo"),
      theater: headerIndex(headers, "Teatro"),
      link: headerIndex(headers, "Link"),
      price: headerIndex(headers, "Prezzo"),
      visible: headerIndex(headers, "Visibile")
    };

    if (indexes.date < 0 || indexes.title < 0) {
      throw new Error('Il file eventi deve contenere almeno le colonne "Giorno" e "Titolo".');
    }

    return rows.slice(1).map(row => normalizeEvent({
      date: row[indexes.date],
      title: row[indexes.title],
      theater: indexes.theater >= 0 ? row[indexes.theater] : "",
      link: indexes.link >= 0 ? row[indexes.link] : "",
      price: indexes.price >= 0 ? row[indexes.price] : "",
      visible: indexes.visible >= 0 ? row[indexes.visible] : "SI"
    })).filter(event => event.date && event.title && event.visible);
  }

  function normalizeEvent(event) {
    return {
      date: normalizeDate(event.date),
      title: String(event.title ?? "").trim(),
      theater: String(event.theater ?? "").trim(),
      link: String(event.link ?? "").trim(),
      price: String(event.price ?? "").trim(),
      visible: String(event.visible ?? "SI").trim().toLocaleUpperCase("it") !== "NO"
    };
  }

  async function loadTextFile() {
    const response = await fetch(TEXT_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error("spettacoli.txt non disponibile (HTTP " + response.status + ")");
    const source = (await response.text()).replace(/^\uFEFF/, "");
    return normalizeRows(parseDelimited(source));
  }

  function loadXlsxLibrary() {
    if (global.XLSX) return Promise.resolve(global.XLSX);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = () => global.XLSX ? resolve(global.XLSX) : reject(new Error("Libreria XLSX non caricata"));
      script.onerror = () => reject(new Error("Impossibile caricare la libreria XLSX"));
      document.head.appendChild(script);
    });
  }

  async function loadLegacyXlsx() {
    const response = await fetch(LEGACY_XLSX_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error("spettacoli.xlsx non disponibile (HTTP " + response.status + ")");
    const XLSX = await loadXlsxLibrary();
    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const rows = records.map(record => {
      const value = name => {
        const key = Object.keys(record).find(item => item.trim().toLocaleLowerCase("it") === name.toLocaleLowerCase("it"));
        return key ? record[key] : "";
      };
      return normalizeEvent({
        date: value("Giorno"),
        title: value("Titolo"),
        theater: value("Teatro"),
        link: value("Link"),
        price: value("Prezzo"),
        visible: value("Visibile") || "SI"
      });
    });
    return rows.filter(event => event.date && event.title && event.visible);
  }

  async function load() {
    try {
      return await loadTextFile();
    } catch (textError) {
      try {
        console.warn("Lettura TXT non riuscita; provo il formato XLSX legacy.", textError);
        return await loadLegacyXlsx();
      } catch (xlsxError) {
        throw new Error("Impossibile caricare il calendario. " + textError.message + " " + xlsxError.message);
      }
    }
  }

  global.EventData = Object.freeze({ load, normalizeDate });
})(window);
