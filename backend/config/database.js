import mongoose from 'mongoose'

const db = mongoose.connection

// Treat any object containing a $-operator inside a query filter as a literal
// value (wraps it in $eq). Blocks NoSQL operator injection such as
// {"email": {"$ne": null}} across every Model.find/findOne call in the app.
mongoose.set('sanitizeFilter', true)

mongoose.connect(process.env.DATABASE_URL)

db.on('connected', function () {
  // console.log(`Connected to MongoDB ${db.name} at ${db.host}:${db.port}`)
  console.log(`Connected to MongoDB`)
})
