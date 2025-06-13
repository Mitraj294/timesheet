import ExcelJS from "exceljs";
import { format } from "date-fns";

// Create a generic Excel report from data and columns
export async function generateExcelReport({
  data,
  columns,
  sheetName = "Report",
  formatRow,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Timesheet App";
  const ws = workbook.addWorksheet(sheetName);
  ws.columns = columns;
  if (columns.length > 0) {
    ws.getRow(1).font = {
      bold: true,
      alignment: { vertical: "middle", horizontal: "center" },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      },
      border: { bottom: { style: "thin" } },
    };
  }

  // Group data by employee (assume first column is employee name)
  const employeeKey = columns[0]?.key || "employee";
  const grouped = {};
  data.forEach((row) => {
    const emp = row[employeeKey] || "Unknown";
    if (!grouped[emp]) grouped[emp] = [];
    grouped[emp].push(row);
  });

  let rowIdx = 2; // Start after header
  Object.entries(grouped).forEach(([employee, rows]) => {
    const startRow = rowIdx;
    rows.forEach((row, i) => {
      const values = columns.map((col, colIdx) => {
        // Only show employee name in first row of group
        if (colIdx === 0) return i === 0 ? employee : "";
        return row[col.key];
      });
      ws.addRow(values);
      rowIdx++;
    });
    // Merge employee name cell vertically for this group
    if (rows.length > 1) {
      ws.mergeCells(startRow, 1, rowIdx - 1, 1);
      ws.getCell(startRow, 1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
  });

  // Auto-width for all columns
  ws.columns.forEach((col) => {
    let maxLength = col.header.length;
    ws.eachRow({ includeEmpty: true }, (row) => {
      const cell = row.getCell(col.key || col.header);
      if (cell && cell.value) {
        const cellLength = String(cell.value).length;
        if (cellLength > maxLength) maxLength = cellLength;
      }
    });
    col.width = Math.max(col.width || 10, maxLength + 2);
  });

  // Remove all filename logic: only return the buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer };
}

// Send Excel file as download to the client
export function sendExcelDownload(res, buffer, fileName) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  res.send(buffer);
}

// Helpers to format date/time for Excel
const formatTime = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : format(date, "hh:mm a");
};
const formatDate = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : format(date, "dd/MM/yyyy");
};
const formatDay = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : format(date, "EEEE");
};

// Generate Excel report for all clients and their timesheets
export async function generateClientTimesheetReport({
  employerClients,
  clientProjects,
  employerEmployees,
  timesheetsGrouped,
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Timesheet App";
  const ws = workbook.addWorksheet("Clients Timesheets");
  ws.addRow([
    "Client",
    "Project",
    "Employee",
    "Date",
    "Day",
    "Start Time",
    "End Time",
    "Lunch",
    "Leave Type",
    "Hours",
    "Notes",
  ]).font = { bold: true };
  ws.columns = [
    { header: "Client", width: 25 },
    { header: "Project", width: 25 },
    { header: "Employee", width: 25 },
    { header: "Date", width: 15 },
    { header: "Day", width: 15 },
    { header: "Start Time", width: 15 },
    { header: "End Time", width: 15 },
    { header: "Lunch", width: 10 },
    { header: "Leave Type", width: 15 },
    { header: "Hours", width: 10 },
    { header: "Notes", width: 30 },
  ];
  employerClients.forEach((client) => {
    const clientRow = ws.addRow([client.name]);
    clientRow.font = { bold: true, size: 14 };
    ws.mergeCells(clientRow.number, 1, clientRow.number, ws.columns.length);
    let clientTotal = 0;
    const projects = clientProjects.filter(
      (p) => p.clientId.toString() === client._id.toString(),
    );
    if (projects.length === 0) {
      ws.addRow(["", "No projects for this client."]);
    } else {
      projects.forEach((project) => {
        const projectRow = ws.addRow(["", project.name]);
        projectRow.font = { bold: true, size: 12 };
        ws.mergeCells(
          projectRow.number,
          2,
          projectRow.number,
          ws.columns.length,
        );
        let projectTotal = 0;
        let hasTimesheets = false;
        employerEmployees.forEach((emp) => {
          const timesheets =
            timesheetsGrouped[client._id.toString()]?.[
              project._id.toString()
            ]?.[emp._id.toString()] || [];
          if (timesheets.length > 0) {
            hasTimesheets = true;
            timesheets.forEach((ts, idx) => {
              ws.addRow([
                "",
                "",
                idx === 0 ? emp.name : "",
                formatDate(ts.date),
                formatDay(ts.date),
                formatTime(ts.startTime),
                formatTime(ts.endTime),
                ts.lunchBreak === "Yes" ? ts.lunchDuration || "00:00" : "",
                ts.leaveType === "None" ? "" : ts.leaveType || "",
                ts.totalHours?.toFixed(2) || "0.00",
                ts.notes || "",
              ]);
              projectTotal += ts.totalHours || 0;
            });
          }
        });
        if (!hasTimesheets && employerEmployees.length > 0) {
          ws.addRow([
            "",
            "",
            "No timesheet entries for this project by your employees.",
          ]);
        } else if (employerEmployees.length === 0) {
          ws.addRow(["", "", "No employees assigned to this employer."]);
        }
        const projectTotalRow = ws.addRow([
          "",
          `Project: ${project.name} - Total Hours:`,
          "",
          "",
          "",
          "",
          "",
          "",
          projectTotal.toFixed(2),
        ]);
        projectTotalRow.font = { bold: true };
        clientTotal += projectTotal;
        ws.addRow([]);
      });
    }
    const clientTotalRow = ws.addRow([
      `Client: ${client.name} - Total Hours:`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      clientTotal.toFixed(2),
    ]);
    clientTotalRow.font = { bold: true };
    ws.mergeCells(clientTotalRow.number, 1, clientTotalRow.number, 9);
    ws.addRow([]);
  });
  return workbook.xlsx.writeBuffer();
}

// Generate Excel report for projects and their timesheets
export async function generateProjectTimesheetReport({
  projects,
  projectTimesheets,
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Timesheet App";
  const ws = workbook.addWorksheet("Project Timesheets");
  ws.addRow([
    "Project",
    "Employee",
    "Date",
    "Day",
    "Start Time",
    "End Time",
    "Lunch",
    "Leave Type",
    "Hours",
    "Notes",
  ]).font = { bold: true };
  ws.columns = [
    { header: "Project", width: 25 },
    { header: "Employee", width: 25 },
    { header: "Date", width: 15 },
    { header: "Day", width: 15 },
    { header: "Start Time", width: 15 },
    { header: "End Time", width: 15 },
    { header: "Lunch", width: 10 },
    { header: "Leave Type", width: 15 },
    { header: "Hours", width: 10 },
    { header: "Notes", width: 30 },
  ];
  projects.forEach((project) => {
    const projectRow = ws.addRow([project.name]);
    projectRow.font = { bold: true, size: 14 };
    ws.mergeCells(projectRow.number, 1, projectRow.number, ws.columns.length);
    let projectTotal = 0;
    const timesheets = projectTimesheets.filter(
      (ts) => ts.projectId?.toString() === project._id.toString(),
    );
    if (timesheets.length === 0) {
      ws.addRow(["", "No timesheet entries for this project."]);
    } else {
      timesheets.forEach((ts) => {
        ws.addRow([
          "",
          ts.employeeId?.name || "",
          formatDate(ts.date),
          formatDay(ts.date),
          formatTime(ts.startTime),
          formatTime(ts.endTime),
          ts.lunchBreak === "Yes" ? ts.lunchDuration || "00:00" : "",
          ts.leaveType === "None" ? "" : ts.leaveType || "",
          ts.totalHours?.toFixed(2) || "0.00",
          ts.notes || "",
        ]);
        projectTotal += ts.totalHours || 0;
      });
    }
    const projectTotalRow = ws.addRow([
      "",
      `Project: ${project.name} - Total Hours:`,
      "",
      "",
      "",
      "",
      "",
      "",
      projectTotal.toFixed(2),
    ]);
    projectTotalRow.font = { bold: true };
    ws.addRow([]);
  });
  return workbook.xlsx.writeBuffer();
}
