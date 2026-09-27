import { Leave } from '../../models/employee-management/leave-model.js';
import { pick } from '../../utils/pick.js';

// Only HR decides on leave. Everyone else sees and edits their own requests.
const LEAVE_MANAGERS = ['Employee Manager'];
// Fields an employee fills in on the leave form. Email and status are never
// taken from the body: Email comes from the token, status from the manager.
const REQUEST_FIELDS = ['Name', 'Reason', 'DateFrom', 'DateTo', 'type'];
const STATUSES = ['Pending', 'Approved', 'Rejected'];

const isLeaveManager = (user) => LEAVE_MANAGERS.includes(user?.designation);
const isOwner = (user, leave) => Boolean(user?.email) && leave.Email === user.email;

async function index(req, res) {
  try {
    // Managers see every request; an employee sees only their own.
    const filter = isLeaveManager(req.user) ? {} : { Email: req.user.email };
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
    if (!isLeaveManager(req.user) && !isOwner(req.user, leave)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(leave);
  } catch (error) {
    res.status(404).json({ error: error });
  }
}

async function create(req, res) {
  try {
    // A new request is always Pending and always filed under the caller's own email.
    const leave = new Leave({ ...pick(req.body, REQUEST_FIELDS), Email: req.user.email });
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

    if (isLeaveManager(req.user)) {
      // Approve / reject: the manager sets the status, and it must be a known value.
      const changes = pick(req.body, [...REQUEST_FIELDS, 'status']);
      if ('status' in changes && !STATUSES.includes(changes.status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      Object.assign(leave, changes);
    } else if (isOwner(req.user, leave) && leave.status === 'Pending') {
      // The owner may correct a request that has not been decided yet, never its status.
      Object.assign(leave, pick(req.body, REQUEST_FIELDS));
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
    // Managers may delete any request; an owner may withdraw only a pending one.
    if (!isLeaveManager(req.user) && !(isOwner(req.user, leave) && leave.status === 'Pending')) {
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
