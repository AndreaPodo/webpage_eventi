(function () {
  "use strict";

  const YEAR = 2026;
  const MONTHS = [10, 11];
  const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const today = new Date();
  let appointments = [];

  const byId = id => document.getElementById(id);

  function dateKey(year, month, day) {
    return [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  }

  function openEventModal(appointment) {
    byId("modal-event-title").textContent = appointment.title || "Evento";
    byId("modal-theater").textContent = appointment.theater || "Non indicato";
    byId("modal-price").textContent = appointment.price || "Non disponibile";

    const link = byId("modal-link");
    let safeUrl = false;
    try {
      const parsed = new URL(appointment.link);
      safeUrl = parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch (_) {}
    link.hidden = !safeUrl;
    if (safeUrl) link.href = appointment.link;
    else link.removeAttribute("href");

    byId("event-modal-backdrop").hidden = false;
    byId("modal-close").focus();
  }

  function closeEventModal() {
    byId("event-modal-backdrop").hidden = true;
  }

  function renderMonth(month) {
    const container = byId("calendar-" + (month + 1));
    container.replaceChildren();

    WEEKDAYS.forEach((label, index) => {
      const weekday = document.createElement("div");
      weekday.className = "weekday" + (index > 4 ? " weekend-heading" : "");
      weekday.textContent = label;
      container.appendChild(weekday);
    });

    const firstOffset = (new Date(YEAR, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(YEAR, month + 1, 0).getDate();
    const totalCells = Math.ceil((firstOffset + daysInMonth) / 7) * 7;
    let monthEventCount = 0;

    for (let index = 0; index < totalCells; index++) {
      const dayNumber = index - firstOffset + 1;
      const cell = document.createElement("div");
      cell.className = "day";

      if (dayNumber < 1 || dayNumber > daysInMonth) {
        cell.classList.add("empty");
        container.appendChild(cell);
        continue;
      }

      if (index % 7 > 4) cell.classList.add("weekend");
      if (today.getFullYear() === YEAR && today.getMonth() === month && today.getDate() === dayNumber) {
        cell.classList.add("today");
      }

      const number = document.createElement("span");
      number.className = "day-number";
      number.textContent = dayNumber;
      cell.appendChild(number);

      const key = dateKey(YEAR, month, dayNumber);
      const dayEvents = appointments.filter(item => item.date === key);
      monthEventCount += dayEvents.length;

      if (dayEvents.length) {
        const list = document.createElement("div");
        list.className = "events";
        dayEvents.forEach(appointment => {
          const event = document.createElement("button");
          event.type = "button";
          event.className = "event";
          event.textContent = appointment.title;
          event.title = "Mostra dettagli: " + appointment.title;
          event.addEventListener("click", () => openEventModal(appointment));
          list.appendChild(event);
        });
        cell.appendChild(list);
      }
      container.appendChild(cell);
    }

    byId("count-" + (month + 1)).textContent = monthEventCount + (monthEventCount === 1 ? " evento" : " eventi");
  }

  function renderAll() {
    MONTHS.forEach(renderMonth);
  }

  function initModal() {
    byId("modal-close").addEventListener("click", closeEventModal);
    byId("event-modal-backdrop").addEventListener("click", event => {
      if (event.target.id === "event-modal-backdrop") closeEventModal();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !byId("event-modal-backdrop").hidden) closeEventModal();
    });
  }

  async function init() {
    initModal();
    renderAll();
    try {
      appointments = (await window.EventData.load()).filter(event =>
        event.visible &&
        event.date.startsWith(YEAR + "-") &&
        MONTHS.includes(Number(event.date.slice(5, 7)) - 1)
      );
      renderAll();
      byId("load-status").textContent = appointments.length
        ? appointments.length + " appuntamenti caricati"
        : "Nessun appuntamento trovato per questo periodo.";
      byId("load-status").classList.toggle("is-empty", appointments.length === 0);
    } catch (error) {
      console.error("Errore caricamento calendario:", error);
      byId("load-status").textContent = "Non è stato possibile caricare gli appuntamenti. Riprova più tardi.";
      byId("load-status").classList.add("is-error");
    }
  }

  init();
})();
