// Seeds one Employee Manager and one Labour account for the security checks.
// Usage (from backend/): DATABASE_URL=... node scripts/seed-security.js
import mongoose from "mongoose";
import { Employee } from "../models/employee-management/employee-model.js";
import "../models/field-management/labour-model.js";
import "../models/transport-management/driver-model.js";

await mongoose.connect(process.env.DATABASE_URL);
const base = {
  age: 35, gender: "Male", dateOfBirth: "1990-01-01", contactNumber: "0770000000",
  dateOfJoining: "2020-01-01", salary: 150000, leavesLeft: "14", address: "Estate Office",
};
for (const e of [
  { ...base, firstName: "Mira", lastName: "Manager", Id: "EMP-001", email: "manager@tea.test",
    designation: "Employee Manager", department: "Employee", password: "Manager#Pass2026" },
  { ...base, firstName: "Lal", lastName: "Labour", Id: "EMP-002", email: "labour@tea.test",
    designation: "Labour", department: "Harvest", password: "Labour#Pass2026" },
]) {
  await Employee.deleteOne({ email: e.email });
  await new Employee(e).save();
}
console.log("seeded");
await mongoose.disconnect();
