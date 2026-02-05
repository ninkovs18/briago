import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!serviceAccountPath) {
  throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON).')
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const DAYS_TO_KEEP = 90
const DRY_RUN = process.env.DRY_RUN === '1'
const DELETE_ALL = process.env.DELETE_ALL === '1'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null

const toDateFromDoc = (doc: any) => {
  if (doc?.expireAt && typeof doc.expireAt.toDate === 'function') {
    return doc.expireAt.toDate()
  }
  if (typeof doc.date === 'string') {
    const d = new Date(`${doc.date}T00:00:00`)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

const buildSlotId = (date?: string, time?: string) => {
  if (!date || !time) return null
  return `${date}_${time}`
}

const run = async () => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP)

  let queryRef: FirebaseFirestore.Query = db.collection('reservations')
  if (!DELETE_ALL) {
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff)
    queryRef = queryRef.where('expireAt', '<=', cutoffTs)
  }
  if (LIMIT && Number.isFinite(LIMIT)) {
    queryRef = queryRef.limit(LIMIT)
  }

  const snapshot = await queryRef.get()
  if (snapshot.empty) {
    console.log('No reservations to clean.')
    return
  }

  let deleted = 0
  let batch = db.batch()
  let batchCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!DELETE_ALL) {
      const docDate = toDateFromDoc(data)
      if (!docDate || docDate > cutoff) continue
    }

    if (!DRY_RUN) {
      batch.delete(doc.ref)
    }
    const slotId = buildSlotId(data.date, data.startTime)
    if (slotId) {
      if (!DRY_RUN) {
        batch.delete(db.collection('slots').doc(slotId))
      }
    }
    deleted += 1
    batchCount += 1

    if (batchCount >= 450) {
      if (!DRY_RUN) {
        await batch.commit()
      }
      batch = db.batch()
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    if (!DRY_RUN) {
      await batch.commit()
    }
  }

  const modeLabel = DRY_RUN ? 'Dry run' : 'Deleted'
  const scopeLabel = DELETE_ALL ? 'all reservations' : `reservations older than ${DAYS_TO_KEEP} days`
  console.log(`${modeLabel} ${deleted} ${scopeLabel}.`)
}

run().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
