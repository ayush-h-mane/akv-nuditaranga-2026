/**
 * ==============================================================================
 * ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026
 * GOOGLE APPS SCRIPT: ATTENDANCE & VOLUNTEER DIRECTORY AUTOMATED SYNC
 * ==============================================================================
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1jDIzvpZSWe_PBFMzYAsR4wMaMcSvK4VO95URw7jsYAc/edit
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. In your Google Spreadsheet, click: Extensions > Apps Script
 * 2. Delete any existing code in Code.gs, paste this entire file, and click Save (💾).
 * 3. Click "Deploy" (top right) > "New deployment".
 * 4. Select type: "Web app" (click the gear ⚙️ icon next to 'Select type').
 * 5. Configuration:
 *    - Description: AKV Nuditaranga 2026 Sync Webhook
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 6. Click "Deploy", authorize permissions when prompted, and copy the Web App URL.
 * 7. Paste that Web App URL into the Superadmin Portal ("Google Sheets Sync" section)
 *    or run `python scripts/sync_google_sheets.py --webhook <url>`.
 * 
 * ⚠️ TROUBLESHOOTING "HTTP error 405: Method Not Allowed":
 * • If you see 405, NEVER paste the Google Spreadsheet link (docs.google.com/spreadsheets/...)
 *   into the webhook box. Only paste the Web App URL (script.google.com/macros/s/.../exec).
 * • If you edited Code.gs after an initial deployment, you MUST create a NEW VERSION:
 *   Click Deploy > Manage deployments > click ✏️ (Edit) > Version: select "New version" > Deploy.
 * • Ensure "Who has access" is set to "Anyone" (not "Only myself").
 * ==============================================================================
 */

// AKV Brand Styling Palette
var THEME = {
  headerBg: "#8B0000",       // Karnataka Crimson / Maroon
  headerText: "#FFFFFF",     // White
  subHeaderBg: "#FEF08A",    // Gold Accent
  subHeaderText: "#713F12",  // Dark Amber
  border: "#E5E7EB",         // Light gray border
  wcHeaderBg: "#1E3A8A",     // Navy Blue for Working Committee
  consolidatedBg: "#065F46", // Emerald Green for Consolidated
  fontFamily: "Arial"
};

/**
 * Add custom AKV menu when opening the spreadsheet
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🎭 AKV Nuditaranga 2026")
    .addItem("⚡ Initialize All Sheets", "menuInitSheets")
    .addItem("🔄 Format & Style All Sheets", "menuFormatSheets")
    .addSeparator()
    .addItem("ℹ️ View Sync Information", "menuShowInfo")
    .addToUi();
}

/**
 * Menu action: initialize empty sheets with headers
 */
function menuInitSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var defaultDomains = [
    "VOLUNTEER DIRECTORY",
    "PROMOTIONS",
    "DECORATIONS",
    "SOCIAL MEDIA",
    "LOGISTICS",
    "CULTURALS",
    "CONTENT",
    "DEFENCE",
    "EMCEE",
    "MARKETING",
    "TECHNICAL",
    "PHOTOGRAPHY",
    "VIDEOGRAPHY",
    "HOSPITALITY",
    "DEVELOPER",
    "WORKING COMMITTEE",
    "CONSOLIDATED ATTENDANCE"
  ];
  
  defaultDomains.forEach(function(title) {
    getOrCreateSheet(ss, title);
  });
  
  SpreadsheetApp.getUi().alert("✅ Success", "All 17 AKV Nuditaranga attendance & volunteer sheets have been initialized!", SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menu action: Show information modal
 */
function menuShowInfo() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var msg = "Spreadsheet: " + ss.getName() + "\n" +
            "Total Sheets: " + ss.getSheets().length + "\n" +
            "Sync Webhook: Deploy via Deploy > New deployment > Web app (Access: Anyone)\n" +
            "Connected Portal: https://akv.acharyahabba.com";
  ui.alert("AKV Nuditaranga 2026 Sync Engine", msg, ui.ButtonSet.OK);
}

/**
 * HTTP GET endpoint - Health check and sheet metadata
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "ready",
    app: "AKV Nuditaranga 2026 Google Sheets Sync Engine",
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheetsCount: sheets.length,
    sheets: sheets,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * HTTP POST endpoint - Receives payload from backend and syncs data
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for up to 30 seconds to prevent race conditions during sync
    lock.waitLock(30000);
    
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse(false, "No payload content provided in POST request.");
    }
    
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse(false, "Invalid JSON payload: " + parseErr.message);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = payload.action || "sync_all";
    var resultStats = {
      volunteersCount: 0,
      wcCount: 0,
      sheetsUpdated: 0,
      dates: []
    };

    if (action === "sync_all" || action === "sync_volunteers" || action === "sync_attendance") {
      var volunteers = payload.volunteers || [];
      var wcMembers = payload.working_committee || [];
      var dates = payload.dates || ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
      var domainGroups = payload.domain_groups || [];
      var attendanceRecords = payload.attendance_records || {}; // lookup key: `${auid}_${date}` -> { in, out, status }
      var baseUrl = payload.base_url || "https://akv.acharyahabba.com";

      resultStats.volunteersCount = volunteers.length;
      resultStats.wcCount = wcMembers.length;
      resultStats.dates = dates;

      // 1. Sync Volunteer Master Directory
      syncVolunteerDirectory(ss, volunteers, baseUrl);
      resultStats.sheetsUpdated++;

      // 2. Sync Individual Department Attendance Sheets
      if (domainGroups.length > 0) {
        domainGroups.forEach(function(group) {
          syncDepartmentSheet(ss, group.name, group.aliases, volunteers, dates, attendanceRecords, baseUrl);
          resultStats.sheetsUpdated++;
        });
      }

      // 3. Sync Working Committee Sheet
      syncWorkingCommitteeSheet(ss, wcMembers, dates, attendanceRecords, baseUrl);
      resultStats.sheetsUpdated++;

      // 4. Sync Consolidated Attendance Sheet
      syncConsolidatedSheet(ss, volunteers, wcMembers, dates, attendanceRecords, baseUrl);
      resultStats.sheetsUpdated++;

      // Remove default empty "Sheet1" if custom sheets are populated
      cleanDefaultSheet(ss);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Successfully synchronized volunteer roster and attendance into Google Spreadsheet!",
      stats: resultStats,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return jsonResponse(false, "Sync execution error: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * 1. Synchronize the Master VOLUNTEER DIRECTORY sheet
 */
function syncVolunteerDirectory(ss, volunteers, baseUrl) {
  var sheet = getOrCreateSheet(ss, "VOLUNTEER DIRECTORY");
  sheet.clear();
  
  var headers = [
    "Sl. No",
    "Reg ID",
    "Full Name",
    "AUID",
    "Institute",
    "Department",
    "Year of Study",
    "Gender",
    "AKV Domain",
    "Contact Number",
    "College Email",
    "Photo Preview",
    "Photo Link",
    "Total Attendance Days",
    "Account Status"
  ];

  setupSheetHeader(sheet, "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026", "Official Volunteer Master Directory with Live Photo Links", headers, THEME.headerBg);

  var rows = [];
  var formulas = [];

  volunteers.forEach(function(v, index) {
    var photoUrl = getVolunteerPhotoUrl(v, baseUrl);
    var imageFormula = photoUrl ? '=IFERROR(IMAGE("' + photoUrl + '", 4, 45, 45), "--")' : '--';
    var linkFormula = photoUrl ? '=HYPERLINK("' + photoUrl + '", "Open Photo")' : '--';

    rows.push([
      index + 1,
      v.registration_id || ("VOL-" + (v.id || index + 1)),
      v.name || "--",
      (v.auid || "--").toUpperCase(),
      v.institute || "Acharya Institute of Technology",
      v.department || "--",
      formatYear(v.semester || v.year),
      v.gender || "--",
      v.volunteer_domain || "--",
      v.phone || "--",
      v.email || "--",
      "", // Will be populated by formula
      "", // Will be populated by formula
      v.total_days_present || 0,
      v.account_status || "ACTIVE"
    ]);

    formulas.push([imageFormula, linkFormula]);
  });

  if (rows.length > 0) {
    sheet.getRange(5, 1, rows.length, headers.length).setValues(rows);
    // Insert photo formulas in columns 12 & 13
    sheet.getRange(5, 12, formulas.length, 2).setFormulas(formulas);
    
    // Batch set row heights for photo previews in single RPC call
    sheet.setRowHeights(5, rows.length, 48);
  }

  formatDataRows(sheet, 5, rows.length, headers.length);
  sheet.setFrozenRows(4);
}

/**
 * 2. Synchronize Individual Department Attendance Sheet
 */
function syncDepartmentSheet(ss, sheetTitle, aliases, volunteers, dates, attendanceLookup, baseUrl) {
  var sheet = getOrCreateSheet(ss, sheetTitle);
  sheet.clear();

  // Filter volunteers belonging to this domain
  var deptVolunteers = volunteers.filter(function(v) {
    if (!v.volunteer_domain) return false;
    var vd = v.volunteer_domain.toLowerCase();
    return aliases.some(function(alias) {
      return vd.indexOf(alias.toLowerCase()) !== -1;
    });
  });

  var headers = [
    "Sl. No",
    "Reg ID",
    "Full Name",
    "AUID",
    "Department",
    "Year",
    "Photo",
    "Contact No"
  ];

  // Dynamic Date Columns (In & Out for each date)
  dates.forEach(function(d) {
    headers.push(d + " (In)");
    headers.push(d + " (Out)");
  });

  headers.push("Days Present");
  headers.push("Managed By");

  setupSheetHeader(sheet, "AKV NUDITARANGA 2026 — " + sheetTitle.toUpperCase() + " WING", "Department Volunteer Roster & Daily Attendance Tracking", headers, THEME.headerBg);

  var rows = [];
  var photoFormulas = [];

  deptVolunteers.forEach(function(v, index) {
    var photoUrl = getVolunteerPhotoUrl(v, baseUrl);
    var photoFormula = photoUrl ? '=HYPERLINK("' + photoUrl + '", "View")' : '--';

    var row = [
      index + 1,
      v.registration_id || ("VOL-" + (v.id || index + 1)),
      v.name || "--",
      (v.auid || "--").toUpperCase(),
      v.department || "--",
      formatYear(v.semester || v.year),
      "", // Will hold photo formula
      v.phone || "--"
    ];

    var daysPresent = 0;
    var managers = [];

    dates.forEach(function(d) {
      var key = (v.auid || "").toUpperCase() + "_" + d;
      var keyId = (v.id || "") + "_" + d;
      var att = attendanceLookup[key] || attendanceLookup[keyId] || null;

      var checkIn = "--";
      var checkOut = "--";

      if (att) {
        checkIn = att.check_in_time || (att.status === "PRESENT" ? "Present" : "--");
        checkOut = att.check_out_time || (att.status === "PRESENT" ? "Present" : "--");
        if (att.is_present || att.status === "PRESENT" || att.status === "COMPLETED") {
          daysPresent++;
        }
        if (att.marked_by && managers.indexOf(att.marked_by) === -1) {
          managers.push(att.marked_by);
        }
      }

      row.push(checkIn);
      row.push(checkOut);
    });

    row.push(daysPresent);
    row.push(managers.length > 0 ? managers.join(", ") : (v.managed_by || "Admin"));

    rows.push(row);
    photoFormulas.push([photoFormula]);
  });

  if (rows.length > 0) {
    sheet.getRange(5, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(5, 7, photoFormulas.length, 1).setFormulas(photoFormulas);
  }

  formatDataRows(sheet, 5, rows.length, headers.length);
  sheet.setFrozenRows(4);
}

/**
 * 3. Synchronize Working Committee Sheet
 */
function syncWorkingCommitteeSheet(ss, wcMembers, dates, attendanceLookup, baseUrl) {
  var sheet = getOrCreateSheet(ss, "WORKING COMMITTEE");
  sheet.clear();

  var headers = [
    "Sl. No",
    "Reg ID",
    "Full Name",
    "AUID",
    "Department",
    "Designation / Role",
    "Photo",
    "Contact No"
  ];

  dates.forEach(function(d) {
    headers.push(d + " (In)");
    headers.push(d + " (Out)");
  });

  headers.push("Days Present");
  headers.push("Status");

  setupSheetHeader(sheet, "ACHARYA KANNADA VEDIKE — WORKING COMMITTEE", "Official Core Committee Attendance Tracking", headers, THEME.wcHeaderBg);

  var rows = [];
  var photoFormulas = [];

  wcMembers.forEach(function(m, index) {
    var photoUrl = getVolunteerPhotoUrl(m, baseUrl);
    var photoFormula = photoUrl ? '=HYPERLINK("' + photoUrl + '", "View")' : '--';

    var row = [
      index + 1,
      m.registration_id || ("WC-" + (m.id || index + 1)),
      m.name || "--",
      (m.auid || "--").toUpperCase(),
      m.department || "--",
      m.working_committee_role || m.admin_type || "Committee Member",
      "",
      m.phone || "--"
    ];

    var daysPresent = 0;
    dates.forEach(function(d) {
      var key = (m.auid || "").toUpperCase() + "_" + d;
      var keyId = (m.id || "") + "_" + d;
      var att = attendanceLookup[key] || attendanceLookup[keyId] || null;

      var checkIn = "--";
      var checkOut = "--";

      if (att) {
        checkIn = att.check_in_time || (att.status === "PRESENT" ? "Present" : "--");
        checkOut = att.check_out_time || (att.status === "PRESENT" ? "Present" : "--");
        if (att.is_present || att.status === "PRESENT" || att.status === "COMPLETED") {
          daysPresent++;
        }
      }

      row.push(checkIn);
      row.push(checkOut);
    });

    row.push(daysPresent);
    row.push(m.account_status || "ACTIVE");

    rows.push(row);
    photoFormulas.push([photoFormula]);
  });

  if (rows.length > 0) {
    sheet.getRange(5, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(5, 7, photoFormulas.length, 1).setFormulas(photoFormulas);
  }

  formatDataRows(sheet, 5, rows.length, headers.length);
  sheet.setFrozenRows(4);
}

/**
 * 4. Synchronize Master Consolidated Sheet
 */
function syncConsolidatedSheet(ss, volunteers, wcMembers, dates, attendanceLookup, baseUrl) {
  var sheet = getOrCreateSheet(ss, "CONSOLIDATED ATTENDANCE");
  sheet.clear();

  var headers = [
    "Sl. No",
    "Member Type",
    "Reg ID",
    "Full Name",
    "AUID",
    "Department",
    "Domain / Role",
    "Photo",
    "Contact No"
  ];

  dates.forEach(function(d) {
    headers.push(d + " (Status)");
  });

  headers.push("Total Days Present");

  setupSheetHeader(sheet, "AKV NUDITARANGA 2026 — MASTER CONSOLIDATED ATTENDANCE", "Combined Department Volunteers & Working Committee Attendance", headers, THEME.consolidatedBg);

  var rows = [];
  var photoFormulas = [];
  var slNo = 1;

  // Department volunteers
  volunteers.forEach(function(v) {
    var photoUrl = getVolunteerPhotoUrl(v, baseUrl);
    var photoFormula = photoUrl ? '=HYPERLINK("' + photoUrl + '", "View")' : '--';

    var row = [
      slNo++,
      "VOLUNTEER",
      v.registration_id || ("VOL-" + (v.id || "")),
      v.name || "--",
      (v.auid || "--").toUpperCase(),
      v.department || "--",
      v.volunteer_domain || "--",
      "",
      v.phone || "--"
    ];

    var daysPresent = 0;
    dates.forEach(function(d) {
      var key = (v.auid || "").toUpperCase() + "_" + d;
      var keyId = (v.id || "") + "_" + d;
      var att = attendanceLookup[key] || attendanceLookup[keyId] || null;

      var statusStr = "--";
      if (att) {
        statusStr = att.status || (att.is_present ? "PRESENT" : "--");
        if (att.is_present || att.status === "PRESENT" || att.status === "COMPLETED") {
          daysPresent++;
        }
      }
      row.push(statusStr);
    });

    row.push(daysPresent);
    rows.push(row);
    photoFormulas.push([photoFormula]);
  });

  // Working committee
  wcMembers.forEach(function(m) {
    var photoUrl = getVolunteerPhotoUrl(m, baseUrl);
    var photoFormula = photoUrl ? '=HYPERLINK("' + photoUrl + '", "View")' : '--';

    var row = [
      slNo++,
      "WORKING COMMITTEE",
      m.registration_id || ("WC-" + (m.id || "")),
      m.name || "--",
      (m.auid || "--").toUpperCase(),
      m.department || "--",
      m.working_committee_role || m.admin_type || "Committee Member",
      "",
      m.phone || "--"
    ];

    var daysPresent = 0;
    dates.forEach(function(d) {
      var key = (m.auid || "").toUpperCase() + "_" + d;
      var keyId = (m.id || "") + "_" + d;
      var att = attendanceLookup[key] || attendanceLookup[keyId] || null;

      var statusStr = "--";
      if (att) {
        statusStr = att.status || (att.is_present ? "PRESENT" : "--");
        if (att.is_present || att.status === "PRESENT" || att.status === "COMPLETED") {
          daysPresent++;
        }
      }
      row.push(statusStr);
    });

    row.push(daysPresent);
    rows.push(row);
    photoFormulas.push([photoFormula]);
  });

  if (rows.length > 0) {
    sheet.getRange(5, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(5, 8, photoFormulas.length, 1).setFormulas(photoFormulas);
  }

  formatDataRows(sheet, 5, rows.length, headers.length);
  sheet.setFrozenRows(4);
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function cleanDefaultSheet(ss) {
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // Ignore if cannot delete
    }
  }
}

function getVolunteerPhotoUrl(volunteer, baseUrl) {
  if (volunteer.photo_direct_url) {
    return volunteer.photo_direct_url;
  }
  if (volunteer.auid) {
    return baseUrl.replace(/\/+$/, "") + "/api/users/" + encodeURIComponent(volunteer.auid.trim().toUpperCase()) + "/photo";
  }
  if (volunteer.id) {
    return baseUrl.replace(/\/+$/, "") + "/api/users/" + volunteer.id + "/photo";
  }
  return "";
}

function formatYear(val) {
  if (!val) return "--";
  var num = parseInt(val, 10);
  if (isNaN(num)) return val.toString();
  if (num <= 6) return num + (num === 1 ? "st Year" : num === 2 ? "2nd Year" : num === 3 ? "3rd Year" : "th Year");
  return "Sem " + num;
}

function setupSheetHeader(sheet, mainTitle, subTitle, headers, headerColor) {
  var totalCols = headers.length;

  // Row 1: Festival Title
  sheet.getRange(1, 1, 1, totalCols).merge();
  var titleCell = sheet.getRange(1, 1);
  titleCell.setValue(mainTitle);
  titleCell.setFontFamily(THEME.fontFamily);
  titleCell.setFontSize(14);
  titleCell.setFontWeight("bold");
  titleCell.setFontColor("#FFFFFF");
  titleCell.setBackground(headerColor);
  titleCell.setHorizontalAlignment("center");
  titleCell.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);

  // Row 2: Sub-title and generated timestamp
  sheet.getRange(2, 1, 1, totalCols).merge();
  var subCell = sheet.getRange(2, 1);
  subCell.setValue(subTitle + " • Synced: " + Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss") + " IST");
  subCell.setFontFamily(THEME.fontFamily);
  subCell.setFontSize(9);
  subCell.setFontStyle("italic");
  subCell.setFontColor(THEME.subHeaderText);
  subCell.setBackground(THEME.subHeaderBg);
  subCell.setHorizontalAlignment("center");
  subCell.setVerticalAlignment("middle");
  sheet.setRowHeight(2, 24);

  // Row 3: Blank separator
  sheet.setRowHeight(3, 8);

  // Row 4: Column Headers
  var headerRange = sheet.getRange(4, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setFontFamily(THEME.fontFamily);
  headerRange.setFontSize(10);
  headerRange.setFontWeight("bold");
  headerRange.setFontColor(THEME.headerText);
  headerRange.setBackground(headerColor);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setWrap(true);
  sheet.setRowHeight(4, 30);
}

function formatDataRows(sheet, startRow, rowCount, colCount) {
  if (rowCount <= 0) return;
  
  var range = sheet.getRange(startRow, 1, rowCount, colCount);
  range.setFontFamily(THEME.fontFamily);
  range.setFontSize(10);
  range.setVerticalAlignment("middle");
  range.setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.SOLID);

  // Center alignment for identifiers, numbers, dates
  range.setHorizontalAlignment("center");

  // Left align names and departments
  sheet.getRange(startRow, 3, rowCount, 1).setHorizontalAlignment("left"); // Name
  sheet.getRange(startRow, 5, rowCount, 1).setHorizontalAlignment("left"); // Department

  // Fast column width defaults (avoids slow autoResizeColumn RPC round-trips)
  if (colCount >= 3) {
    sheet.setColumnWidth(1, 55);   // Sl. No
    sheet.setColumnWidth(2, 100);  // Reg ID
    sheet.setColumnWidth(3, 180);  // Full Name
  }
  if (colCount >= 5) {
    sheet.setColumnWidth(4, 130);  // AUID
    sheet.setColumnWidth(5, 140);  // Department
  }
}

function jsonResponse(success, message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
