import { PatientList } from "@/components/admin/PatientList";

export const metadata = { title: "Patients" };

export default function Page() {
  return (
    <>
      <div className="admin-top"><div><h1>Patients</h1><p className="muted" style={{ margin: 0 }}>Registered patient accounts. Passwords are never shown or stored in readable form.</p></div></div>
      <PatientList />
    </>
  );
}
