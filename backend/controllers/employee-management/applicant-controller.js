import { Applicant } from '../../models/employee-management/applicant-model.js';
import { pick } from '../../utils/pick.js';

async function index(req, res) {
  try {
    //get all applicants
    const applicants = await Applicant.find({});
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ error: error });
  }
}

async function show(req, res) {
  try {
    //id_applicant = req.params.id
    const applicant = await Applicant.findById(req.params.id);
    res.json(applicant);
  } catch (error) {
    res.status(404).json({ error: error });
  }
}

async function create(req, res) {
  try {
    // Public form: only applicant-supplied fields, never status/_id set by HR.
    const applicant = new Applicant(pick(req.body, ['name', 'nic', 'email', 'file']));
    await applicant.save();
    res.json(applicant);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function update(req, res) {
  try {

    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    Object.assign(applicant, req.body);
    await applicant.save();
    res.json(applicant);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function destroy(req, res) {
  try {
    const applicant = await Applicant.findByIdAndDelete(req.params.id);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    await applicant.deleteOne();
    res.json({ message: 'Applicant deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });

  }
}

export { index, show, create, update, destroy };