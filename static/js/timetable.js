document.addEventListener("DOMContentLoaded", () => {
    const startTimeInput = document.getElementById("startTime");
    const endTimeInput = document.getElementById("endTime");
    const periodCountInput = document.getElementById("periodCount");
    const viewPeriodTimesButton = document.getElementById("viewPeriodTimes");
    const periodTimesDisplay = document.getElementById("periodTimesDisplay");
  
    const addBreakButton = document.getElementById("add-break");
    const viewBreakLayoutButton = document.getElementById("view-break-layout");
    const breaksContainer = document.getElementById("breaks-container");
    const layoutDisplay = document.getElementById("layoutDisplay");
  
    const generateClassesButton = document.getElementById("generate-classes");
    const classesContainer = document.getElementById("classes-container");
    const timetableForm = document.getElementById("timetable-form");
    const saveTimetableButton = document.getElementById("save-timetable");
    const timetableDisplay = document.getElementById("timetable-display");
    const workingDaysSelect = document.getElementById("workingDays");
  
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
    function parseTimeString(timeStr) {
      const [hour, min] = timeStr.split(":").map(Number);
      return hour * 60 + min;
    }
  
    function formatTime(minutes) {
      minutes = Math.round(minutes / 5) * 5;
      const hour24 = Math.floor(minutes / 60);
      const min = minutes % 60;
      const hour12 = hour24 % 12 || 12;
      const ampm = hour24 >= 12 ? "PM" : "AM";
      return `${hour12}:${String(min).padStart(2, "0")} ${ampm}`;
    }
  
    function generateLayout(startTimeStr, endTimeStr, periodCount, breaks = []) {
      const start = parseTimeString(startTimeStr);
      const end = parseTimeString(endTimeStr);
      const totalAvailableMinutes = end - start;
      const totalBreakMinutes = breaks.reduce((sum, b) => sum + b.duration, 0);
      const periodMinutes = Math.floor((totalAvailableMinutes - totalBreakMinutes) / periodCount);
  
      let timeline = [];
      let current = start;
      let periodNumber = 1;
  
      for (let i = 0; i < periodCount; i++) {
        timeline.push({
          label: `Period ${periodNumber++}`,
          start: formatTime(current),
          end: formatTime(current + periodMinutes),
          isBreak: false,
          duration: periodMinutes
        });
        current += periodMinutes;
  
        const matchingBreaks = breaks.filter(b => b.after === i + 1);
        for (const b of matchingBreaks) {
          timeline.push({
            label: b.name,
            start: formatTime(current),
            end: formatTime(current + b.duration),
            isBreak: true,
            duration: b.duration
          });
          current += b.duration;
        }
      }
  
      return timeline;
    }
  
    function calculatePreviewLayout() {
      const startTime = startTimeInput.value;
      const endTime = endTimeInput.value;
      const periodCount = parseInt(periodCountInput.value);
  
      if (!startTime || !endTime || isNaN(periodCount) || periodCount < 1) {
        layoutDisplay.innerHTML = "<p>Please enter valid time and period count first.</p>";
        return null;
      }
  
      const breaks = Array.from(document.querySelectorAll(".break-entry")).map(b => ({
        name: b.querySelector(".break-name").value.trim(),
        duration: parseInt(b.querySelector(".break-duration").value),
        after: parseInt(b.querySelector(".break-after").value)
      })).filter(b => b.name && !isNaN(b.duration) && !isNaN(b.after));
  
      return generateLayout(startTime, endTime, periodCount, breaks);
    }
  
    viewPeriodTimesButton.addEventListener("click", () => {
      const periods = calculatePreviewLayout();
      if (!periods) return;
  
      periodTimesDisplay.innerHTML = "<h4>Period Times:</h4><ul>" +
        periods.filter(p => !p.isBreak).map(p => `<li>${p.label}: ${p.start} - ${p.end}</li>`).join("") +
        "</ul>";
    });
  
    addBreakButton.addEventListener("click", () => {
      const div = document.createElement("div");
      div.classList.add("break-entry");
      div.innerHTML = `
        <label>Break Name:</label>
        <input type="text" class="break-name" placeholder="e.g., Lunch" required>
        <label>Duration (minutes):</label>
        <input type="number" class="break-duration" min="1" required>
        <label>Insert After Period:</label>
        <input type="number" class="break-after" min="0" placeholder="e.g., 3" required>
      `;
      breaksContainer.appendChild(div);
    });
  
    viewBreakLayoutButton.addEventListener("click", () => {
      const periods = calculatePreviewLayout();
      if (!periods) return;
  
      layoutDisplay.innerHTML = "<h4>Schedule Layout:</h4><ul>" +
        periods.map(slot =>
          `<li><strong>${slot.label}</strong>: ${slot.start} - ${slot.end} ${slot.isBreak ? "(Break)" : ""}</li>`
        ).join("") +
        "</ul>";
    });
  
    generateClassesButton.addEventListener("click", () => {
      const classCount = parseInt(document.getElementById("classCount").value);
      if (isNaN(classCount) || classCount < 1) return alert("Enter valid class count.");
  
      classesContainer.innerHTML = "";
  
      for (let i = 0; i < classCount; i++) {
        const classDiv = document.createElement("div");
        classDiv.classList.add("department");
  
        classDiv.innerHTML = `
          <h3>Class/Department ${i + 1}</h3>
          <label>Class Name:</label>
          <input type="text" class="class-name" required>
          <label>Number of Sections:</label>
          <input type="number" class="section-count" min="1" required>
          <button type="button" class="generate-sections">+ Generate Sections</button>
          <div class="sections-container"></div>
  
          <h4>Subjects</h4>
          <div class="subjects-container"></div>
          <button type="button" class="add-subject">+ Add Subject</button>
          <hr>
        `;
        classesContainer.appendChild(classDiv);
      }
  
      attachSubjectAndSectionListeners();
    });
  
    function attachSubjectAndSectionListeners() {
      document.querySelectorAll(".generate-sections").forEach(btn => {
        btn.addEventListener("click", () => {
          const div = btn.closest(".department");
          const count = parseInt(div.querySelector(".section-count").value);
          const container = div.querySelector(".sections-container");
          container.innerHTML = "";
  
          for (let i = 0; i < count; i++) {
            const input = document.createElement("input");
            input.type = "text";
            input.classList.add("section-name");
            input.placeholder = `Section ${String.fromCharCode(65 + i)}`;
            container.appendChild(input);
          }
        });
      });
  
      document.querySelectorAll(".add-subject").forEach(btn => {
        btn.addEventListener("click", () => {
          const container = btn.closest(".department").querySelector(".subjects-container");
          const div = document.createElement("div");
          div.classList.add("subject-entry");
          div.innerHTML = `
            <label>Subject:</label>
            <input type="text" class="subject" required>
            <label>Teachers (comma-separated):</label>
            <input type="text" class="teachers" required>
            <label>Lab:</label>
            <input type="checkbox" class="isLab">
            <label>Frequency:</label>
            <input type="number" class="frequency" min="1" max="10" required>
            <label>Lab Duration:</label>
            <input type="number" class="duration" min="1" max="6" value="1">
          `;
          container.appendChild(div);
        });
      });
    }
  
    timetableForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const layout = calculatePreviewLayout();
      if (!layout) return;
  
      const workingDays = parseInt(workingDaysSelect.value);
      const daysOfWeek = allDays.slice(0, workingDays);
      timetableDisplay.innerHTML = "";
  
      document.querySelectorAll(".department").forEach(deptDiv => {
        const className = deptDiv.querySelector(".class-name").value;
        const sectionNames = Array.from(deptDiv.querySelectorAll(".section-name")).map(i => i.value.trim());
  
        const subjects = Array.from(deptDiv.querySelectorAll(".subject-entry")).map(div => ({
          name: div.querySelector(".subject").value,
          teachers: div.querySelector(".teachers").value.split(",").map(t => t.trim()),
          isLab: div.querySelector(".isLab").checked,
          frequency: parseInt(div.querySelector(".frequency").value),
          duration: parseInt(div.querySelector(".duration").value)
        }));
  
        const teacherBookings = {};
  
        sectionNames.forEach(section => {
          const timetable = {};
          daysOfWeek.forEach(day => {
            timetable[day] = layout.map(p => (p.isBreak ? { ...p } : null));
          });
  
          subjects.forEach(subject => {
            let placed = 0;
  
            for (let d = 0; d < daysOfWeek.length && placed < subject.frequency; d++) {
              const day = daysOfWeek[d];
              const slots = timetable[day];
  
              const alreadyToday = slots.some(s => s && s.subject === subject.name);
              if (alreadyToday && !subject.isLab) continue;
  
              for (let i = 0; i <= slots.length - subject.duration; i++) {
                const slotGroup = slots.slice(i, i + subject.duration);
                if (slotGroup.some(s => s && s.subject)) continue;
                if (slotGroup.some(s => s && s.isBreak)) continue;
  
                if (!subject.isLab && d > 0 && timetable[daysOfWeek[d - 1]][i]?.subject === subject.name) continue;
  
                const availableTeacher = subject.teachers.find(teacher =>
                  slotGroup.every((_, idx) => !teacherBookings[`${teacher}-${day}-${i + idx}`])
                );
  
                if (!availableTeacher) continue;
  
                for (let j = 0; j < subject.duration; j++) {
                  slots[i + j] = {
                    subject: subject.name,
                    teacher: availableTeacher,
                    isLab: subject.isLab,
                    period: i + j + 1,
                    time: layout[i + j]
                  };
                  teacherBookings[`${availableTeacher}-${day}-${i + j}`] = true;
                }
  
                placed++;
                break;
              }
            }
          });
  
          const table = document.createElement("table");
          table.classList.add("timetable-table");
          const caption = document.createElement("caption");
          caption.textContent = `${className} - Section ${section}`;
          table.appendChild(caption);
  
          const thead = document.createElement("thead");
          const headRow = document.createElement("tr");
          headRow.innerHTML = `<th>Day</th>` + layout.map(p => `<th>${p.label}<br>${p.start} - ${p.end}</th>`).join("");
          thead.appendChild(headRow);
          table.appendChild(thead);
  
          const tbody = document.createElement("tbody");
          daysOfWeek.forEach(day => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${day}</td>`;
            timetable[day].forEach(cell => {
              if (cell?.isBreak) {
                row.innerHTML += `<td><strong>${cell.label}</strong></td>`;
              } else if (cell) {
                row.innerHTML += `<td>${cell.subject}<br><small>${cell.teacher}</small>${cell.isLab ? "<br><strong>Lab</strong>" : ""}</td>`;
              } else {
                row.innerHTML += "<td></td>";
              }
            });
            tbody.appendChild(row);
          });
  
          table.appendChild(tbody);
          timetableDisplay.appendChild(table);
        });
      });
    });
  
    saveTimetableButton.addEventListener("click", async () => {
      const data = saveTimetableButton.dataset.timetables;
      if (!data) return alert("Generate timetables first.");
      const response = await fetch("/save_timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data
      });
      const result = await response.json();
      alert(result.message);
    });
  
    document.getElementById("toggle-theme").addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
    });
  });
  