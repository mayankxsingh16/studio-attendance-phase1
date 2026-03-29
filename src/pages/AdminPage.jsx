import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import client, { getApiErrorMessage } from "../api/client";
import { useSocket } from "../hooks/useSocket";

function formatDateInput(value) {
  return value.toISOString().slice(0, 10);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SimpleBarChart({ title, data, valueKey, colorClass, emptyText, formatter = (value) => value }) {
  const maxValue = Math.max(...data.map((item) => item[valueKey] || 0), 1);

  return (
    <div className="chart-card">
      <h4>{title}</h4>
      {data.length === 0 ? (
        <p className="small-text">{emptyText}</p>
      ) : (
        <div className="chart-bars">
          {data.map((item) => (
            <div key={item.date || item.name} className="chart-bar-row">
              <div className="chart-label">{item.date || item.name}</div>
              <div className="chart-track">
                <div
                  className={`chart-bar ${colorClass}`}
                  style={{ width: `${((item[valueKey] || 0) / maxValue) * 100}%` }}
                />
              </div>
              <div className="chart-value">{formatter(item[valueKey] || 0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getSuggestedRadius(accuracy) {
  const numericAccuracy = Number(accuracy || 0);
  return Math.max(100, Math.ceil(numericAccuracy * 3));
}

function DocumentList({ documents, emptyText = "No documents uploaded yet." }) {
  if (!documents?.length) {
    return <p className="small-text">{emptyText}</p>;
  }

  return (
    <div className="document-list">
      {documents.map((document, index) => (
        <a
          key={`${document.url}-${index}`}
          className="document-link"
          href={document.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>{document.name || `Document ${index + 1}`}</span>
          <span className="small-text">
            {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : "Uploaded"}
          </span>
        </a>
      ))}
    </div>
  );
}

function EmployeeEditModal({
  employee,
  form,
  faceFile,
  avatarFile,
  documentFiles,
  documentActions,
  onChange,
  onFaceChange,
  onAvatarChange,
  onDocumentsChange,
  onDocumentActionChange,
  onClose,
  onSave,
  saving
}) {
  if (!employee) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="section-row">
          <div>
            <h3>Edit Employee</h3>
            <p className="small-text">{employee.email}</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <form onSubmit={onSave} className="form-stack">
          <div className="profile-header">
            <div className="avatar-shell">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.name} className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">{(employee.name || "E").slice(0, 1).toUpperCase()}</div>
              )}
            </div>
            <div>
              <p className="small-text">Update the employee basics, avatar, face reference, and documents here.</p>
            </div>
          </div>
          <input
            placeholder="Employee name"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            required
          />
          <input
            placeholder="Phone number"
            value={form.phone}
            onChange={(event) => onChange("phone", event.target.value)}
          />
          <input
            type="password"
            placeholder="New password (leave blank to keep current)"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
          />
          <label className="small-text">Profile photo / avatar</label>
          <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={onAvatarChange} />
          {avatarFile ? <p className="small-text">Selected avatar: {avatarFile.name}</p> : null}
          <label className="small-text">Face reference image</label>
          <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={onFaceChange} />
          {faceFile ? <p className="small-text">Selected face image: {faceFile.name}</p> : null}
          <label className="small-text">Employee documents (PDF or image, multiple allowed)</label>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/jpg"
            multiple
            onChange={onDocumentsChange}
          />
          {documentFiles.length > 0 ? (
            <div className="document-list compact">
              {documentFiles.map((file) => (
                <div key={`${file.name}-${file.lastModified}`} className="document-link static">
                  <span>{file.name}</span>
                  <span className="small-text">{Math.ceil(file.size / 1024)} KB</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="inner-card">
            <h4>Existing documents</h4>
            {documentActions.length > 0 ? (
              <div className="document-list">
                {documentActions.map((document, index) => (
                  <div key={`${document.url}-${index}`} className="document-editor-row">
                    <a href={document.url} target="_blank" rel="noreferrer" className="small-text">
                      Open
                    </a>
                    <input
                      value={document.name}
                      onChange={(event) => onDocumentActionChange(document.url, "name", event.target.value)}
                      placeholder="Document name"
                    />
                    <button
                      type="button"
                      className={document.delete ? "danger-button" : ""}
                      onClick={() => onDocumentActionChange(document.url, "delete", !document.delete)}
                    >
                      {document.delete ? "Undo delete" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <DocumentList documents={employee.documents || []} />
            )}
          </div>
          <button type="submit" disabled={saving}>
            {saving ? "Saving employee..." : "Save employee"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ employee, onClose, onConfirm, deleting }) {
  if (!employee) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Delete Employee</h3>
        <p>
          Delete <strong>{employee.name}</strong>?
        </p>
        <p className="small-text">
          This removes the employee, their attendance history, and any device binding.
        </p>
        <div className="action-cell">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeProfilePanel({ profile, onEdit, onResetDevice, onToggleStatus, onDelete, actionLoading }) {
  const [activeTab, setActiveTab] = useState("overview");
  const employeeId = profile?.employee?._id;

  useEffect(() => {
    if (employeeId) {
      setActiveTab("overview");
    }
  }, [employeeId]);

  if (!profile) {
    return null;
  }

  const employee = profile.employee;

  return (
    <div className="card">
      <div className="section-row">
        <div>
          <h3>Employee Profile</h3>
          <p className="small-text">{employee.email}</p>
        </div>
        <div className="action-cell">
          <button onClick={() => onEdit(employee)} disabled={actionLoading === `edit-${employee._id}`}>
            Edit employee
          </button>
          <button onClick={() => onToggleStatus(employee)} disabled={actionLoading === `status-${employee._id}`}>
            {employee.isActive ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => onResetDevice(employee._id)} disabled={actionLoading === `reset-${employee._id}`}>
            Reset device
          </button>
          <button className="danger-button" onClick={() => onDelete(employee)} disabled={actionLoading === `delete-${employee._id}`}>
            Delete
          </button>
        </div>
      </div>

      <div className="profile-header">
        <div className="avatar-shell">
          {employee.avatarUrl ? (
            <img src={employee.avatarUrl} alt={employee.name} className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">{(employee.name || "E").slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div>
          <h4>{employee.name}</h4>
          <p className="small-text">
            {employee.isActive ? "Active account" : "Inactive account"} | {employee.phone || "No phone number"}
          </p>
          <p className="small-text">Created {new Date(employee.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="tab-row">
        {["overview", "attendance", "device", "alerts"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid-two">
          <div className="profile-grid">
            <div>
              <span className="small-text">Name</span>
              <p>{employee.name}</p>
            </div>
              <div>
              <span className="small-text">Phone Number</span>
              <p>{employee.phone || "Not set"}</p>
            </div>
            <div>
              <span className="small-text">Status</span>
              <p>{employee.isActive ? "Active" : "Inactive"}</p>
            </div>
            <div>
              <span className="small-text">Face</span>
              <p>{employee.faceEnrolled ? "Enrolled" : "Missing"}</p>
            </div>
            <div>
              <span className="small-text">Late cutoff</span>
              <p>{employee.lateCutoffLabel}</p>
            </div>
            <div>
              <span className="small-text">Today</span>
              <p>{employee.todayAttendance ? employee.todayAttendance.status : "No attendance yet"}</p>
            </div>
          </div>
          <div className="inner-card">
            <h4>Documents</h4>
            <DocumentList documents={employee.documents || []} />
          </div>
        </div>
      ) : null}

      {activeTab === "attendance" ? (
        <>
          <div className="grid-two">
            <div className="profile-grid">
              <div>
                <span className="small-text">Total days</span>
                <p>{employee.stats.totalDays}</p>
              </div>
              <div>
                <span className="small-text">Present</span>
                <p>{employee.stats.present}</p>
              </div>
              <div>
                <span className="small-text">Late</span>
                <p>{employee.stats.late}</p>
              </div>
              <div>
                <span className="small-text">Today</span>
                <p>{employee.todayAttendance ? employee.todayAttendance.status : "No attendance yet"}</p>
              </div>
            </div>
            {employee.todayAttendance?.checkIn?.photoUrl ? (
              <div className="preview-block">
                <h4>Today&apos;s Check-in Photo</h4>
                <img src={employee.todayAttendance.checkIn.photoUrl} alt={employee.name} className="preview-image" />
              </div>
            ) : (
              <div className="inner-card">
                <h4>Today&apos;s Check-in Photo</h4>
                <p className="small-text">No check-in photo yet today.</p>
              </div>
            )}
          </div>

          <div className="card inner-card">
            <h4>Recent Attendance</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Face</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.recentAttendance.map((record) => (
                    <tr key={record._id}>
                      <td>{record.date}</td>
                      <td>{record.status}</td>
                      <td>{record.checkIn?.faceVerified ? "Verified" : "Review"}</td>
                      <td>{record.checkIn?.time ? new Date(record.checkIn.time).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                  {employee.recentAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="4">No attendance history yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "device" ? (
        <div className="grid-two">
          <div className="profile-grid">
            <div>
              <span className="small-text">Device state</span>
              <p>{employee.deviceBound ? "Bound" : "Not bound"}</p>
            </div>
            <div>
              <span className="small-text">Bound at</span>
              <p>{employee.deviceInfo?.boundAt ? new Date(employee.deviceInfo.boundAt).toLocaleString() : "N/A"}</p>
            </div>
            <div>
              <span className="small-text">Fingerprint</span>
              <p className="small-text break-word">{employee.deviceInfo?.fingerprint || "Not available"}</p>
            </div>
          </div>
          <div className="inner-card">
            <h4>Browser Details</h4>
            <p className="small-text break-word">{employee.deviceInfo?.userAgent || "No device profile available."}</p>
          </div>
        </div>
      ) : null}

      {activeTab === "alerts" ? (
        <div className="grid-two">
          <div className="profile-grid">
              <div>
              <span className="small-text">Phone Number</span>
              <p>{employee.phone || "No employee phone number set"}</p>
            </div>
            <div>
              <span className="small-text">Late reminder rule</span>
              <p>After {employee.lateCutoffLabel}</p>
            </div>
            <div>
              <span className="small-text">Alert readiness</span>
              <p>{employee.phone ? "Employee can receive alerts" : "Employee number missing"}</p>
            </div>
          </div>
          <div className="inner-card">
            <h4>Alert Notes</h4>
              <p className="small-text">
              Contact-ready employees are the ones with a phone number saved in their profile.
              </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  const today = useMemo(() => formatDateInput(new Date()), []);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeQr, setActiveQr] = useState(null);
  const [officeLocation, setOfficeLocation] = useState({ lat: "", lng: "", radiusMeters: "" });
  const [officeLocationMeta, setOfficeLocationMeta] = useState({ accuracy: null, suggestedRadius: null });
  const [employeeFilters, setEmployeeFilters] = useState({ query: "", status: "all", device: "all" });
  const [filters, setFilters] = useState({ status: "", dateFrom: today, dateTo: today });
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [faceReferenceFile, setFaceReferenceFile] = useState(null);
  const [phoneDrafts, setPhoneDrafts] = useState({});
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", password: "" });
  const [editFaceFile, setEditFaceFile] = useState(null);
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editDocumentFiles, setEditDocumentFiles] = useState([]);
  const [editDocumentActions, setEditDocumentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const filteredEmployees = useMemo(() => {
    const query = employeeFilters.query.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesQuery =
        !query ||
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        (employee.phone || "").toLowerCase().includes(query);

      const matchesStatus =
        employeeFilters.status === "all" ||
        (employeeFilters.status === "active" && employee.isActive) ||
        (employeeFilters.status === "inactive" && !employee.isActive);

      const matchesDevice =
        employeeFilters.device === "all" ||
        (employeeFilters.device === "bound" && employee.deviceBound) ||
        (employeeFilters.device === "unbound" && !employee.deviceBound);

      return matchesQuery && matchesStatus && matchesDevice;
    });
  }, [employeeFilters, employees]);

  const loadDashboard = async (activeFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      const [employeeResponse, attendanceResponse, statsResponse, qrResponse, officeResponse, logsResponse] =
        await Promise.all([
          client.get("/admin/employees"),
          client.get("/admin/attendance/today"),
          client.get("/admin/stats"),
          client.get("/qr/active"),
          client.get("/admin/office/location"),
          client.get("/admin/attendance/logs", { params: activeFilters })
        ]);

      const nextEmployees = employeeResponse.data.employees;
      setEmployees(nextEmployees);
      setPhoneDrafts(Object.fromEntries(nextEmployees.map((employee) => [employee._id, employee.phone || ""])));
      setRecords(attendanceResponse.data.records);
      setStats(statsResponse.data);
      setActiveQr(qrResponse.data.qr);
      setOfficeLocation({
        lat: String(officeResponse.data.officeLocation.lat ?? ""),
        lng: String(officeResponse.data.officeLocation.lng ?? ""),
        radiusMeters: String(officeResponse.data.officeLocation.radiusMeters ?? "")
      });
      setOfficeLocationMeta({ accuracy: null, suggestedRadius: null });
      setLogs(logsResponse.data.records);
      setLiveFeed(attendanceResponse.data.records.slice(0, 8));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not load the admin dashboard."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useSocket(
    "new_checkin",
    (payload) => {
      setLiveFeed((prev) => [payload, ...prev].slice(0, 10));
      setRecords((prev) => [
        {
          _id: payload.attendanceId,
          employee: payload.employee,
          status: payload.status,
          checkIn: {
            time: payload.time,
            photoUrl: payload.photoUrl,
            faceVerified: payload.faceVerified,
            faceMatchScore: payload.faceMatchScore
          }
        },
        ...prev
      ]);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              present: payload.isLate ? prev.present : prev.present + 1,
              late: payload.isLate ? prev.late + 1 : prev.late,
              absent: Math.max(
                prev.totalEmployees - (payload.isLate ? prev.present + prev.late + 1 : prev.present + 1 + prev.late),
                0
              )
            }
          : prev
      );
    },
    true
  );

  const createEmployee = async (event) => {
    event.preventDefault();
    setActionLoading("create-employee");
    setMessage("");
    setError("");

    try {
      const faceReferenceBase64 = faceReferenceFile ? await fileToBase64(faceReferenceFile) : "";

      await client.post("/auth/register", {
        ...form,
        faceReferenceBase64
      });
      setForm({ name: "", email: "", password: "", phone: "" });
      setFaceReferenceFile(null);
      setMessage("Employee created.");
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not create employee."));
    } finally {
      setActionLoading("");
    }
  };

  const generateQr = async (forceNew = false) => {
    setActionLoading(forceNew ? "force-generate-qr" : "generate-qr");
    setMessage("");
    setError("");

    try {
      const response = await client.post("/qr/generate", { forceNew });
      setActiveQr(response.data);
      if (response.data.forced) {
        setMessage("Today's QR was replaced with a new one.");
      } else {
        setMessage(response.data.reused ? "Today's QR is already active." : "New daily QR generated.");
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not generate QR."));
    } finally {
      setActionLoading("");
    }
  };

  const resetDevice = async (userId) => {
    setActionLoading(`reset-${userId}`);
    setMessage("");
    setError("");

    try {
      await client.delete(`/admin/devices/${userId}`);
      setMessage("Device binding reset.");
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not reset device."));
    } finally {
      setActionLoading("");
    }
  };

  const toggleEmployeeStatus = async (employee) => {
    setActionLoading(`status-${employee._id}`);
    setMessage("");
    setError("");

    try {
      const response = await client.patch(`/admin/employees/${employee._id}/status`, {
        isActive: !employee.isActive
      });
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not update employee status."));
    } finally {
      setActionLoading("");
    }
  };

  const uploadFaceReference = async (employeeId, file) => {
    setActionLoading(`face-${employeeId}`);
    setMessage("");
    setError("");

    try {
      const faceReferenceBase64 = await fileToBase64(file);
      const response = await client.post(`/admin/employees/${employeeId}/face-reference`, {
        faceReferenceBase64
      });
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not upload face reference."));
    } finally {
      setActionLoading("");
    }
  };

  const saveOfficeLocation = async (event) => {
    event.preventDefault();
    setActionLoading("save-office");
    setMessage("");
    setError("");

    try {
      const response = await client.post("/admin/office/location", {
        lat: Number(officeLocation.lat),
        lng: Number(officeLocation.lng),
        radiusMeters: Number(officeLocation.radiusMeters)
      });
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not save office location."));
    } finally {
      setActionLoading("");
    }
  };

  const useCurrentLocationForOffice = async () => {
    setActionLoading("detect-office");
    setMessage("");
    setError("");

    try {
      if (!navigator.geolocation) {
        throw new Error("Browser geolocation is not available on this device.");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const suggestedRadius = getSuggestedRadius(position.coords.accuracy);
      const currentRadius = Number(officeLocation.radiusMeters || 0);

      setOfficeLocation((prev) => ({
        ...prev,
        lat: String(position.coords.latitude),
        lng: String(position.coords.longitude),
        radiusMeters: String(currentRadius > suggestedRadius ? currentRadius : suggestedRadius)
      }));
      setOfficeLocationMeta({
        accuracy: position.coords.accuracy,
        suggestedRadius
      });
      setMessage("Current location loaded into the office settings form with a GPS-based radius suggestion.");
    } catch (locationError) {
      setError(
        locationError?.message ||
          "Could not read your current location. Allow location access and try again."
      );
    } finally {
      setActionLoading("");
    }
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    await loadDashboard(filters);
  };

  const exportCsv = async () => {
    setActionLoading("export-csv");
    setError("");

    try {
      const response = await client.get("/admin/attendance/export", {
        params: filters,
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${filters.dateFrom}-to-${filters.dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("CSV exported.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not export CSV."));
    } finally {
      setActionLoading("");
    }
  };

  const savePhoneInline = async (employeeId) => {
    setActionLoading(`phone-${employeeId}`);
    setMessage("");
    setError("");

    try {
      const response = await client.patch(`/admin/employees/${employeeId}`, {
        phone: phoneDrafts[employeeId] || ""
      });
      setMessage(response.data.message);
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not update employee phone number."));
    } finally {
      setActionLoading("");
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      name: employee.name || "",
      phone: employee.phone || "",
      password: ""
    });
    setEditFaceFile(null);
    setEditAvatarFile(null);
    setEditDocumentFiles([]);
    setEditDocumentActions(
      (employee.documents || []).map((document) => ({
        url: document.url,
        name: document.name || "Document",
        delete: false
      }))
    );
  };

  const saveEmployeeEdit = async (event) => {
    event.preventDefault();
    if (!editingEmployee) {
      return;
    }

    setActionLoading(`edit-${editingEmployee._id}`);
    setMessage("");
    setError("");

    try {
      const payload = {
        name: editForm.name,
        phone: editForm.phone,
        password: editForm.password
      };

      if (editFaceFile) {
        payload.faceReferenceBase64 = await fileToBase64(editFaceFile);
      }

      if (editAvatarFile) {
        payload.avatarBase64 = await fileToBase64(editAvatarFile);
      }

      if (editDocumentFiles.length > 0) {
        payload.documents = await Promise.all(
          editDocumentFiles.map(async (file) => ({
            name: file.name,
            base64: await fileToBase64(file)
          }))
        );
      }

      const renameDocuments = editDocumentActions
        .filter((document) => !document.delete)
        .map((document) => ({
          url: document.url,
          name: document.name
        }));
      const deleteDocuments = editDocumentActions
        .filter((document) => document.delete)
        .map((document) => document.url);

      if (renameDocuments.length > 0) {
        payload.renameDocuments = renameDocuments;
      }

      if (deleteDocuments.length > 0) {
        payload.deleteDocuments = deleteDocuments;
      }

      const response = await client.patch(`/admin/employees/${editingEmployee._id}`, payload);
      setMessage(response.data.message);
      setEditingEmployee(null);
      setEditFaceFile(null);
      setEditAvatarFile(null);
      setEditDocumentFiles([]);
      setEditDocumentActions([]);
      await loadDashboard();
      if (selectedEmployeeProfile?.employee?._id === editingEmployee._id) {
        await loadEmployeeProfile(editingEmployee._id);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not update employee."));
    } finally {
      setActionLoading("");
    }
  };

  const deleteEmployee = async () => {
    if (!deletingEmployee) {
      return;
    }

    setActionLoading(`delete-${deletingEmployee._id}`);
    setMessage("");
    setError("");

    try {
      const response = await client.delete(`/admin/employees/${deletingEmployee._id}`);
      setMessage(response.data.message);
      setDeletingEmployee(null);
      if (selectedEmployeeProfile?.employee?._id === deletingEmployee._id) {
        setSelectedEmployeeProfile(null);
      }
      await loadDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not delete employee."));
    } finally {
      setActionLoading("");
    }
  };

  const loadEmployeeProfile = async (employeeId) => {
    setActionLoading(`profile-${employeeId}`);
    setError("");

    try {
      const response = await client.get(`/admin/employees/${employeeId}/profile`);
      setSelectedEmployeeProfile(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not load employee profile."));
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="page-wrap">
      {error && <div className="card alert-error">{error}</div>}
      {message && <div className="card alert-success">{message}</div>}

      <div className="grid-two">
        <div className="card">
          <h2>Admin Dashboard</h2>
          {loading && <p>Loading dashboard summary...</p>}
          {stats && (
            <>
              <p className="small-text">Late attendance cutoff: {stats.lateCutoffLabel}</p>
              <div className="stats-grid stats-grid-large">
                <div className="stat-card">
                  <span>Total</span>
                  <strong>{stats.totalEmployees}</strong>
                </div>
                <div className="stat-card">
                  <span>Present</span>
                  <strong>{stats.present}</strong>
                </div>
                <div className="stat-card">
                  <span>Late</span>
                  <strong>{stats.late}</strong>
                </div>
                <div className="stat-card">
                  <span>Absent</span>
                  <strong>{stats.absent}</strong>
                </div>
                <div className="stat-card">
                  <span>Face Verified</span>
                  <strong>{stats.faceVerificationRate}%</strong>
                </div>
                <div className="stat-card">
                  <span>Avg Check-in</span>
                  <strong>{stats.averageCheckInHour}:00</strong>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3>Live Feed</h3>
          <div className="live-feed">
            {liveFeed.map((item, index) => (
              <div key={item.attendanceId || item._id || index} className="live-feed-item">
                <img
                  src={item.photoUrl || item.checkIn?.photoUrl}
                  alt={item.employee?.name}
                  className="thumbnail"
                />
                <div>
                  <strong>{item.employee?.name}</strong>
                  <p>{item.isLate || item.status === "late" ? "Late" : "Present"}</p>
                  <p className="small-text">
                    Face: {item.faceVerified || item.checkIn?.faceVerified ? "Verified" : "Review"}
                  </p>
                </div>
              </div>
            ))}
            {!loading && liveFeed.length === 0 && <p>No live check-ins yet.</p>}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid-two">
          <SimpleBarChart
            title="Weekly Attendance Trend"
            data={stats.weeklyTrend || []}
            valueKey="total"
            colorClass="chart-bar-primary"
            emptyText="No attendance data yet."
          />
          <SimpleBarChart
            title="Top Late Employees"
            data={stats.topLateEmployees || []}
            valueKey="lateCount"
            colorClass="chart-bar-warning"
            emptyText="No late employees this week."
            formatter={(value) => `${value} late`}
          />
        </div>
      )}

      <div className="grid-two">
        <div className="card">
          <h3>Active QR</h3>
          <div className="action-cell">
            <button onClick={() => generateQr(false)} disabled={actionLoading === "generate-qr" || actionLoading === "force-generate-qr"}>
              {actionLoading === "generate-qr" ? "Generating QR..." : "Generate QR"}
            </button>
            <button onClick={() => generateQr(true)} disabled={actionLoading === "generate-qr" || actionLoading === "force-generate-qr"}>
              {actionLoading === "force-generate-qr" ? "Replacing..." : "Force new QR"}
            </button>
          </div>
          {activeQr ? (
            <div className="qr-box">
              <QRCodeCanvas value={activeQr.token} size={220} />
              <p className="small-text">Valid for all employees today: {activeQr.validForDate}</p>
              <p className="small-text">Expires: {new Date(activeQr.expiresAt).toLocaleString()}</p>
            </div>
          ) : (
            <p>No active QR right now.</p>
          )}
        </div>

        <div className="card">
          <h3>Office Location</h3>
          <form onSubmit={saveOfficeLocation} className="form-stack">
            <button
              type="button"
              onClick={useCurrentLocationForOffice}
              disabled={actionLoading === "detect-office"}
            >
              {actionLoading === "detect-office" ? "Detecting location..." : "Use my current location"}
            </button>
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={officeLocation.lat}
              onChange={(event) => setOfficeLocation((prev) => ({ ...prev, lat: event.target.value }))}
              required
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={officeLocation.lng}
              onChange={(event) => setOfficeLocation((prev) => ({ ...prev, lng: event.target.value }))}
              required
            />
            <input
              type="number"
              placeholder="Radius in meters"
              value={officeLocation.radiusMeters}
              onChange={(event) =>
                setOfficeLocation((prev) => ({ ...prev, radiusMeters: event.target.value }))
              }
              required
            />
            <button type="submit" disabled={actionLoading === "save-office"}>
              {actionLoading === "save-office" ? "Saving office..." : "Save office location"}
            </button>
          </form>
          {officeLocationMeta.suggestedRadius ? (
            <p className="small-text">
              GPS accuracy was about {Math.round(officeLocationMeta.accuracy)}m, so the suggested radius is{" "}
              {officeLocationMeta.suggestedRadius}m.
            </p>
          ) : null}
          {officeLocation.lat && officeLocation.lng ? (
            <div className="map-preview-block">
              <iframe
                title="Office map preview"
                className="map-preview"
                src={`https://maps.google.com/maps?q=${officeLocation.lat},${officeLocation.lng}&z=16&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid-two">
        <div className="card">
          <h3>Create Employee</h3>
          <form onSubmit={createEmployee} className="form-stack">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <input
              placeholder="Employee phone number"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(event) => setFaceReferenceFile(event.target.files?.[0] || null)}
            />
            <button type="submit" disabled={actionLoading === "create-employee"}>
              {actionLoading === "create-employee" ? "Creating employee..." : "Create employee"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Employees</h3>
          {loading && <p>Loading employees...</p>}
          <div className="filter-grid employee-filter-grid">
            <input
              placeholder="Search by name, email, or phone"
              value={employeeFilters.query}
              onChange={(event) =>
                setEmployeeFilters((prev) => ({ ...prev, query: event.target.value }))
              }
            />
            <select
              value={employeeFilters.status}
              onChange={(event) =>
                setEmployeeFilters((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select
              value={employeeFilters.device}
              onChange={(event) =>
                setEmployeeFilters((prev) => ({ ...prev, device: event.target.value }))
              }
            >
              <option value="all">All devices</option>
              <option value="bound">Bound devices</option>
              <option value="unbound">Unbound devices</option>
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Device</th>
                  <th>Face</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee._id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>
                      <div className="inline-edit-cell">
                        <input
                          value={phoneDrafts[employee._id] || ""}
                          onChange={(event) =>
                            setPhoneDrafts((prev) => ({ ...prev, [employee._id]: event.target.value }))
                          }
                          placeholder="Phone number"
                        />
                        <button
                          onClick={() => savePhoneInline(employee._id)}
                          disabled={actionLoading === `phone-${employee._id}`}
                        >
                          {actionLoading === `phone-${employee._id}` ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={employee.isActive ? "badge-active" : "badge-inactive"}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{employee.deviceBound ? "Bound" : "Not bound"}</td>
                    <td>{employee.faceEnrolled ? "Enrolled" : "Missing"}</td>
                    <td className="action-cell">
                      <button
                        onClick={() => loadEmployeeProfile(employee._id)}
                        disabled={actionLoading === `profile-${employee._id}`}
                      >
                        {actionLoading === `profile-${employee._id}` ? "Loading..." : "View profile"}
                      </button>
                      <button
                        onClick={() => openEditModal(employee)}
                        disabled={actionLoading === `edit-${employee._id}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingEmployee(employee)}
                        className="danger-button"
                        disabled={actionLoading === `delete-${employee._id}`}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => toggleEmployeeStatus(employee)}
                        disabled={actionLoading === `status-${employee._id}`}
                      >
                        {actionLoading === `status-${employee._id}`
                          ? "Saving..."
                          : employee.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                      <button
                        onClick={() => resetDevice(employee._id)}
                        disabled={actionLoading === `reset-${employee._id}`}
                      >
                        {actionLoading === `reset-${employee._id}` ? "Resetting..." : "Reset device"}
                      </button>
                      <label className="button-label">
                        {actionLoading === `face-${employee._id}` ? "Uploading..." : "Upload face"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              uploadFaceReference(employee._id, file);
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </td>
                  </tr>
                ))}
                {!loading && filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="7">No employees match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EmployeeProfilePanel
        profile={selectedEmployeeProfile}
        onEdit={openEditModal}
        onResetDevice={resetDevice}
        onToggleStatus={toggleEmployeeStatus}
        onDelete={setDeletingEmployee}
        actionLoading={actionLoading}
      />

      <div className="card">
        <div className="section-row">
          <h3>Attendance Logs</h3>
          <button onClick={exportCsv} disabled={actionLoading === "export-csv"}>
            {actionLoading === "export-csv" ? "Exporting..." : "Export CSV"}
          </button>
        </div>
        <form onSubmit={applyFilters} className="filter-grid">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
          </select>
          <button type="submit" disabled={loading}>
            Apply filters
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Status</th>
                <th>Face</th>
                <th>Time</th>
                <th>Photo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((record) => (
                <tr key={record._id}>
                  <td>{record.date}</td>
                  <td>{record.employee?.name}</td>
                  <td>{record.status}</td>
                  <td>
                    {record.checkIn?.faceVerified ? "Verified" : "Review"} ({record.checkIn?.faceMatchScore ?? 0})
                  </td>
                  <td>{new Date(record.checkIn.time).toLocaleString()}</td>
                  <td>
                    <img src={record.checkIn.photoUrl} alt={record.employee?.name} className="thumbnail" />
                  </td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan="6">No attendance logs for these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Today's Attendance</h3>
        {loading && <p>Loading today's attendance...</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Face</th>
                <th>Time</th>
                <th>Photo</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  <td>{record.employee?.name}</td>
                  <td>{record.status}</td>
                  <td>
                    {record.checkIn?.faceVerified ? "Verified" : "Review"} ({record.checkIn?.faceMatchScore ?? 0})
                  </td>
                  <td>{new Date(record.checkIn.time).toLocaleString()}</td>
                  <td>
                    <img src={record.checkIn.photoUrl} alt={record.employee?.name} className="thumbnail" />
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan="5">No attendance records today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeEditModal
        employee={editingEmployee}
        form={editForm}
        faceFile={editFaceFile}
        avatarFile={editAvatarFile}
        documentFiles={editDocumentFiles}
        documentActions={editDocumentActions}
        onChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
        onFaceChange={(event) => setEditFaceFile(event.target.files?.[0] || null)}
        onAvatarChange={(event) => setEditAvatarFile(event.target.files?.[0] || null)}
        onDocumentsChange={(event) => setEditDocumentFiles(Array.from(event.target.files || []))}
        onDocumentActionChange={(documentUrl, field, value) =>
          setEditDocumentActions((prev) =>
            prev.map((document) =>
              document.url === documentUrl ? { ...document, [field]: value } : document
            )
          )
        }
        onClose={() => {
          setEditingEmployee(null);
          setEditDocumentActions([]);
          setEditDocumentFiles([]);
          setEditAvatarFile(null);
          setEditFaceFile(null);
        }}
        onSave={saveEmployeeEdit}
        saving={Boolean(editingEmployee && actionLoading === `edit-${editingEmployee._id}`)}
      />
      <ConfirmDeleteModal
        employee={deletingEmployee}
        onClose={() => setDeletingEmployee(null)}
        onConfirm={deleteEmployee}
        deleting={Boolean(deletingEmployee && actionLoading === `delete-${deletingEmployee._id}`)}
      />
    </div>
  );
}

