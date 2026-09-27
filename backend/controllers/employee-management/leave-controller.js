import { Leave } from '../../models/employee-management/leave-model.js';
import { pick } from '../../utils/pick.js';

// Fields a staff member may set when applying or editing a pending request.
// status and Email are never taken from the body: status defaults to Pending,
// Email is bound to the logged-in account so nobody can file leave as someone else.
const STAFF_FIELDS = ['Name', 'Reason', 'DateFrom', 'DateTo', 'type'];
const ALLOWED_STATUS = new Set(['Approved', 'Rejected']);

function isHr(user) {
  return user?.designation === 'Employee Manager';
}

function ownsLeave(user, leave) {
  return user && leave && String(leave.Email).toLowerCase() === String(user.email).toLowerCase();
}

async function index(req, res) {
  try {
    // HR sees every request; everyone else only their own.
    const filter = isHr(req.user) ? {} : { Email: req.user.email };
    const leaves = await Leave.find(filter);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error });
  }
}

async function show(req, res) {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (!isHr(req.user) && !ownsLeave(req.user, leave)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(leave);
  } catch (error) {
    res.status(404).json({ error: error });
  }
}

async function create(req, res) {
  try {
    const leave = new Leave({
      ...pick(req.body, STAFF_FIELDS),
      Email: req.user.email,
      status: 'Pending',
    });
    await leave.save();
    res.json(leave);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function update(req, res) {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    if (isHr(req.user)) {
      // Approval / rejection only. HR does not rewrite the applicant's form fields here.
      const status = req.body?.status;
      if (!ALLOWED_STATUS.has(status)) {
        return res.status(400).json({ error: 'status must be Approved or Rejected' });
      }
      leave.status = status;
    } else if (ownsLeave(req.user, leave)) {
      if (leave.status !== 'Pending') {
        return res.status(403).json({ error: 'Only pending leave requests can be edited' });
      }
      Object.assign(leave, pick(req.body, STAFF_FIELDS));
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await leave.save();
    res.json(leave);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function destroy(req, res) {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    if (isHr(req.user)) {
      // HR may remove any request.
    } else if (ownsLeave(req.user, leave)) {
      if (leave.status !== 'Pending') {
        return res.status(403).json({ error: 'Only pending leave requests can be deleted' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await leave.deleteOne();
    res.json({ message: 'Leave deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
}

export { index, show, create, update, destroy };
