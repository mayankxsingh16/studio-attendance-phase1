import AttendanceFlow from "../components/AttendanceFlow";

export default function AttendancePage() {
  return (
    <div className="page-wrap">
      <div className="card">
        <h1>Mark Attendance</h1>
        <p>Complete the steps in order: GPS, QR scan, then live photo.</p>
      </div>
      <AttendanceFlow />
    </div>
  );
}
