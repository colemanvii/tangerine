(() => {
  const data = window.HAVEN_MORNING || { orientation: "", sections: [] };
  const now = new Date();

  const today = document.getElementById("today");
  const orientation = document.getElementById("orientation-copy");
  const sections = document.getElementById("morning-sections");
  const ring = document.getElementById("year-ring");
  const description = document.getElementById("year-description");

  today.dateTime = now.toISOString();
  today.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(now).toUpperCase();

  orientation.textContent = data.orientation;

  for (const item of data.sections) {
    const row = document.createElement("section");
    row.className = "item";

    const label = document.createElement("h2");
    label.className = "item-label";
    label.textContent = item.label;

    const body = document.createElement("p");
    body.className = "item-body";
    body.textContent = item.body;

    row.append(label, body);
    sections.append(row);
  }

  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const radius = 61;

  months.forEach((month, index) => {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    const label = document.createElement("span");
    label.className = "month";
    label.textContent = month;
    label.style.transform =
      `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
    ring.append(label);
  });

  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  const progress = (now - start) / (end - start);
  const angle = progress * Math.PI * 2 - Math.PI / 2;

  const marker = document.createElement("span");
  marker.className = "now";
  marker.style.transform =
    `translate(${Math.cos(angle) * 73}px, ${Math.sin(angle) * 73}px)`;
  ring.append(marker);

  description.textContent =
    `Annual compass. Current position: ${months[now.getMonth()]} ${now.getDate()}.`;
})();
