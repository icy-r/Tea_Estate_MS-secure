import { Profile } from '../../models/user-management/profile-model.js'

async function index(req, res) {
  try {
    const profiles = await Profile.find({})
    res.json(profiles)
  } catch (err) {
    console.log(err)
    res.status(500).json(err)
  }
}

async function addPhoto(req, res) {
  try {
    if (!req.file) return res.status(400).json({ err: 'An image file is required' })
    const profile = await Profile.findById(req.params.id)
    if (!profile) return res.status(404).json({ err: 'Profile not found' })
    // Store only the generated file name, never a client-influenced path.
    const imageFile = req.file.filename

    // Handle photo upload differently or remove this part if not needed
    // For now, let's assume we just save the file path to the profile
    profile.photo = imageFile
    
    await profile.save()
    res.status(201).json(profile.photo)
  } catch (err) {
    console.log(err)
    res.status(500).json(err)
  }
}

export { index, addPhoto }