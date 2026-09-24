import React, { useState, useEffect } from "react";
import { ACHARYA_INSTITUTES, STANDARD_DEPARTMENTS } from "../config/institutesData";
import { Building2, BookOpen, Edit3 } from "lucide-react";

export const InstituteDepartmentSelect = ({
  institute,
  onInstituteChange,
  department,
  onDepartmentChange,
  instituteLabel = "Institute *",
  departmentLabel = "Department *"
}) => {
  const isCustomInitial = department && !STANDARD_DEPARTMENTS.includes(department);
  const [isManualDept, setIsManualDept] = useState(isCustomInitial);
  const [selectedDeptDropdown, setSelectedDeptDropdown] = useState(
    isCustomInitial ? "OTHER_MANUAL" : department || STANDARD_DEPARTMENTS[0]
  );
  const [manualDeptText, setManualDeptText] = useState(isCustomInitial ? department : "");

  // Sync internal state when external department changes
  useEffect(() => {
    if (department) {
      if (STANDARD_DEPARTMENTS.includes(department)) {
        setIsManualDept(false);
        setSelectedDeptDropdown(department);
      } else {
        setIsManualDept(true);
        setSelectedDeptDropdown("OTHER_MANUAL");
        setManualDeptText(department);
      }
    }
  }, [department]);

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedDeptDropdown(val);
    if (val === "OTHER_MANUAL") {
      setIsManualDept(true);
      onDepartmentChange(manualDeptText || "");
    } else {
      setIsManualDept(false);
      onDepartmentChange(val);
    }
  };

  const handleManualTextChange = (e) => {
    const text = e.target.value;
    setManualDeptText(text);
    onDepartmentChange(text);
  };

  return (
    <>
      {/* Institute Selector */}
      <div>
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-kar-red" />
          <span>{instituteLabel}</span>
        </label>
        <select
          value={institute}
          onChange={(e) => onInstituteChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red text-stone-900 text-xs sm:text-sm bg-white font-medium shadow-xs"
          required
        >
          {ACHARYA_INSTITUTES.map((inst) => (
            <option key={inst} value={inst}>
              {inst}
            </option>
          ))}
        </select>
      </div>

      {/* Department Selector with Manual Entry Support */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>{departmentLabel}</span>
          </label>
          <button
            type="button"
            onClick={() => {
              if (isManualDept) {
                setIsManualDept(false);
                setSelectedDeptDropdown(STANDARD_DEPARTMENTS[0]);
                onDepartmentChange(STANDARD_DEPARTMENTS[0]);
              } else {
                setIsManualDept(true);
                setSelectedDeptDropdown("OTHER_MANUAL");
                onDepartmentChange(manualDeptText);
              }
            }}
            className="text-[10px] text-kar-red font-bold hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <Edit3 className="w-2.5 h-2.5" />
            <span>{isManualDept ? "Choose from list" : "Type manually"}</span>
          </button>
        </div>

        {!isManualDept ? (
          <select
            value={selectedDeptDropdown}
            onChange={handleDropdownChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red text-stone-900 text-xs sm:text-sm bg-white font-medium shadow-xs"
            required
          >
            {STANDARD_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
            <option value="OTHER_MANUAL">-- Other (Enter Manually) --</option>
          </select>
        ) : (
          <div className="space-y-1">
            <input
              type="text"
              value={manualDeptText}
              onChange={handleManualTextChange}
              placeholder="Enter department name (e.g. Mechatronics, Cyber Security)"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-kar-red/60 focus:outline-none focus:ring-2 focus:ring-kar-red text-stone-900 text-xs sm:text-sm bg-amber-50/20 font-medium"
              required
              autoFocus
            />
            <p className="text-[10px] text-stone-400">
              Custom department will be recorded on your pass and profile.
            </p>
          </div>
        )}
      </div>
    </>
  );
};
