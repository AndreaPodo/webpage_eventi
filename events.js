/* Loader comune per spettacoli, concerti ed eventi. */
(function (global) {
  "use strict";
  const CONFIG = {
    spettacoli: { file: "./spettacoli.txt", start: "2026-11-16", end: "2026-12-31", label: "Spettacoli" },
    concerti: { file: "./concerti.txt", start: "2026-11-16", end: "2027-04-27", label: "Concerti" },
    eventi: { file: "./eventi.txt", start: "2026-11-16", end: "2026-12-31", label: "Eventi" }
  };
  function parseRows(source) {
    const rows = []; let row = [], field = "", quoted = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ";") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[i + 1] === "\n") i++;
        row.push(field); if (row.some(v => v.trim())) rows.push(row);
        row = []; field = "";
      } else field += ch;
    }
    row.push(field); if (row.some(v => v.trim())) rows.push(row);
    return rows;
  }
  function iso(value) {
    const s = String(value || "").trim();
    let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (m) return valid(+m[3], +m[2], +m[1]);
    m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) return valid(+m[1], +m[2], +m[3]);
    return "";
  }
  function valid(y, m, d) {
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
      ? [y, String(m).padStart(2,"0"), String(d).padStart(2,"0")].join("-") : "";
  }
  function normHeaders(row) { return row.map(v => String(v).replace(/^\uFEFF/,"").trim().toLocaleLowerCase("it")); }
  function pick(row, headers, names) {
    for (const name of names) { const i = headers.indexOf(name.toLocaleLowerCase("it")); if (i >= 0) return String(row[i] || "").trim(); }
    return "";
  }
  async function load(key) {
    const cfg = CONFIG[key];
    if (!cfg) throw new Error("Sezione sconosciuta: " + key);
    const response = await fetch(cfg.file, { cache: "no-store" });
    if (!response.ok) throw new Error(cfg.file + " non disponibile (HTTP " + response.status + ")");
    const rows = parseRows((await response.text()).replace(/^\uFEFF/,""));
    if (!rows.length) return [];
    const headers = normHeaders(rows.shift());
    return rows.map(row => {
      const start = iso(pick(row, headers, ["giorno","data"]));
      const end = iso(pick(row, headers, ["fine","al","data fine"])) || start;
      return {
        date: start,
        endDate: end,
        title: pick(row, headers, ["titolo","evento"]),
        venue: pick(row, headers, ["luogo","teatro","sede"]),
        city: pick(row, headers, ["città","citta","comune"]),
        link: pick(row, headers, ["link","url","fonte"]),
        price: pick(row, headers, ["prezzo","costo","ingresso"]),
        category: pick(row, headers, ["categoria","tipologia"]) || "Da classificare",
        time: pick(row, headers, ["orario","ora"])
      };
    }).filter(e => e.date && e.title && e.date <= cfg.end && e.endDate >= cfg.start)
      .sort((a,b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "it"));
  }
  global.EventData = Object.freeze({ load, config: CONFIG });
})(window);
