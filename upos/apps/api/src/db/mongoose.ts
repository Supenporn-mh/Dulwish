import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://upos:upos_secret@localhost:27017/upos?authSource=admin'

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('[DB] MongoDB connected')
  } catch (err) {
    console.error('[DB] Connection failed:', err)
    process.exit(1)
  }
}

export { mongoose }
