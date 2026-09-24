import { Employee } from '../../models/employee-management/employee-model.js';
import { pick } from '../../utils/pick.js';

// Fields an Employee Manager may set on a staff record.
const MANAGER_FIELDS = ['firstName', 'lastName', 'Id', 'email', 'age', 'gender', 'dateOfBirth',
  'contactNumber', 'designation', 'department', 'dateOfJoining', 'salary', 'leavesLeft', 'address', 'ot'];
// Fields an employee may change on their own profile (no role, salary or department).
const SELF_FIELDS = ['firstName', 'lastName', 'age', 'gender', 'dateOfBirth', 'contactNumber', 'address'];

async function index(req, res) {
  try {
    //get all employees
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error });
  }
}

async function show(req, res) {
  try {
    //id_employee = req.params.id
    // Managers/supervisors may view any record; everyone else only their own.
    const isSelf = req.user && String(req.user._id) === String(req.params.id);
    const canViewAll = req.user && (/Manager$/.test(req.user.designation) || req.user.designation === 'Supervisor');
    if (!isSelf && !canViewAll) return res.status(403).json({ error: 'Forbidden' });
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(404).json({ error: error });
  }
}

async function create(req, res) {
  try {
    // Initial password is set by the manager on creation only.
    const employee = new Employee({ ...pick(req.body, MANAGER_FIELDS), password: req.body.password });
    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function update(req, res) {
  try {

    const isManager = req.user?.designation === 'Employee Manager';
    const isSelf = req.user && String(req.user._id) === String(req.params.id);
    if (!isManager && !isSelf) return res.status(403).json({ error: 'Forbidden' });

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Ownership + field allow-list: a normal employee can edit personal details
    // on their own record, but never designation, department or salary.
    Object.assign(employee, pick(req.body, isManager ? MANAGER_FIELDS : SELF_FIELDS));
    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function destroy(req, res) {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    await employee.deleteOne();
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });

  }
}

async function updateOT(req, res) {
  try {
    const updatedEmployees = req.body;

    for (const emp of updatedEmployees) {
      await Employee.findOneAndUpdate(
        { firstName: emp.name },
        { $inc: { ot: emp.overtimeAllowance } },
        { new: true }
      );
    }

    res.status(200).json({ message: "Overtime updated successfully" });
  } catch (error) {
    console.error("Error updating overtime:", error);
    res.status(500).json({ error: "Failed to update overtime" });
  }
}

export { index, show, create, update, destroy, updateOT };