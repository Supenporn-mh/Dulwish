import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Booking, BookingMenu, BookingTimeSlot, BookingConfig, BookingBlackout } from '../../models'

export const bookingController = new Elysia({ prefix: '/booking' })
  .use(authPlugin())

  // ── Bookings (/booking/bookings) ─────────────────────────────────────────────

  .get('/bookings', async () => {
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean()
    return { bookings }
  })

  .post('/bookings', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const booking = await Booking.create(body)
    return { booking }
  }, {
    body: t.Object({
      code:          t.String(),
      name:          t.String(),
      type:          t.Optional(t.String()),
      bookingDate:   t.Optional(t.String()),
      slotId:        t.Optional(t.String()),
      slot:          t.Optional(t.String()),
      slotTime:      t.Optional(t.String()),
      status:        t.Optional(t.String()),
      bookedAt:      t.Optional(t.String()),
      cancelledAt:   t.Optional(t.String()),
      cancelReason:  t.Optional(t.String()),
      adminCode:     t.Optional(t.String()),
      studentUserId: t.Optional(t.String()),
      parentUserId:  t.Optional(t.String()),
    }),
  })

  .patch('/bookings/:code', async ({ params, body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const update: Record<string, unknown> = {}
    if (body.status        !== undefined) update.status        = body.status
    if (body.cancelReason  !== undefined) update.cancelReason  = body.cancelReason
    if (body.adminCode     !== undefined) update.adminCode     = body.adminCode
    if (body.name          !== undefined) update.name          = body.name
    if (body.type          !== undefined) update.type          = body.type
    if (body.bookingDate   !== undefined) update.bookingDate   = body.bookingDate
    if (body.slotId        !== undefined) update.slotId        = body.slotId
    if (body.slot          !== undefined) update.slot          = body.slot
    if (body.slotTime      !== undefined) update.slotTime      = body.slotTime
    if (body.bookedAt      !== undefined) update.bookedAt      = body.bookedAt
    if (body.studentUserId !== undefined) update.studentUserId = body.studentUserId
    if (body.parentUserId  !== undefined) update.parentUserId  = body.parentUserId
    if (body.status === 'ยกเลิก') update.cancelledAt = new Date()
    const booking = await Booking.findOneAndUpdate(
      { code: params.code },
      update,
      { new: true },
    ).lean()
    if (!booking) {
      set.status = 404
      return { error: { code: 'BOOKING_001', message: 'Booking not found' } }
    }
    return { booking }
  }, {
    body: t.Object({
      status:        t.Optional(t.String()),
      cancelReason:  t.Optional(t.String()),
      adminCode:     t.Optional(t.String()),
      name:          t.Optional(t.String()),
      type:          t.Optional(t.String()),
      bookingDate:   t.Optional(t.String()),
      slotId:        t.Optional(t.String()),
      slot:          t.Optional(t.String()),
      slotTime:      t.Optional(t.String()),
      bookedAt:      t.Optional(t.String()),
      studentUserId: t.Optional(t.String()),
      parentUserId:  t.Optional(t.String()),
    }),
  })

  .delete('/bookings/:code', async ({ params, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const booking = await Booking.findOneAndDelete({ code: params.code })
    if (!booking) {
      set.status = 404
      return { error: { code: 'BOOKING_001', message: 'Booking not found' } }
    }
    return { ok: true }
  })

  // ── Booking Menus (/booking/menus) ───────────────────────────────────────────

  .get('/menus', async () => {
    const menus = await BookingMenu.find().sort({ createdAt: -1 }).lean()
    return { menus }
  })

  .post('/menus/import', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    let inserted = 0
    let updated = 0
    const errors: string[] = []
    for (const row of body.rows) {
      try {
        const filter = { name: row.name }
        const timeSlot = row.timeSlot ?? ''
        const enabled = row.status
          ? row.status.toLowerCase().includes('เปิด') || row.status.toLowerCase() === 'true'
          : true
        const update: Record<string, unknown> = { name: row.name, timeSlot, enabled }
        if (row.startDate !== undefined) update.startDate = row.startDate
        if (row.endDate   !== undefined) update.endDate   = row.endDate
        const existing = await BookingMenu.findOne(filter)
        if (existing) {
          await BookingMenu.findOneAndUpdate(filter, update, { new: true })
          updated++
        } else {
          await BookingMenu.create(update)
          inserted++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Row "${row.name}": ${msg}`)
      }
    }
    return { inserted, updated, errors }
  }, {
    body: t.Object({
      rows: t.Array(t.Object({
        name:      t.String(),
        timeSlot:  t.String(),
        status:    t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate:   t.Optional(t.String()),
      })),
    }),
  })

  .post('/menus', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const menu = await BookingMenu.create(body)
    return { menu }
  }, {
    body: t.Object({
      name:       t.String(),
      ingredient: t.Optional(t.String()),
      timeSlot:   t.Optional(t.String()),
      price:      t.Optional(t.Number()),
      enabled:    t.Optional(t.Boolean()),
      startDate:  t.Optional(t.String()),
      endDate:    t.Optional(t.String()),
    }),
  })

  .patch('/menus/:id', async ({ params, body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const menu = await BookingMenu.findByIdAndUpdate(params.id, body, { new: true }).lean()
    if (!menu) {
      set.status = 404
      return { error: { code: 'MENU_001', message: 'Booking menu not found' } }
    }
    return { menu }
  }, {
    body: t.Object({
      name:       t.Optional(t.String()),
      ingredient: t.Optional(t.String()),
      timeSlot:   t.Optional(t.String()),
      price:      t.Optional(t.Number()),
      enabled:    t.Optional(t.Boolean()),
      startDate:  t.Optional(t.String()),
      endDate:    t.Optional(t.String()),
    }),
  })

  .delete('/menus/:id', async ({ params, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const menu = await BookingMenu.findByIdAndDelete(params.id)
    if (!menu) {
      set.status = 404
      return { error: { code: 'MENU_001', message: 'Booking menu not found' } }
    }
    return { ok: true }
  })

  // ── Booking Time Slots (/booking/time-slots) ─────────────────────────────────

  .get('/time-slots', async () => {
    const timeSlots = await BookingTimeSlot.find().lean()
    return { timeSlots }
  })

  .post('/time-slots', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const timeSlot = await BookingTimeSlot.create(body)
    return { timeSlot }
  }, {
    body: t.Object({
      name:        t.String(),
      meal:        t.Optional(t.String()),
      startTime:   t.Optional(t.String()),
      endTime:     t.Optional(t.String()),
      capacity:    t.Optional(t.Number()),
      cutoffHours: t.Optional(t.Number()),
      description: t.Optional(t.String()),
      enabled:     t.Optional(t.Boolean()),
    }),
  })

  .patch('/time-slots/:id', async ({ params, body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const timeSlot = await BookingTimeSlot.findByIdAndUpdate(params.id, body, { new: true }).lean()
    if (!timeSlot) {
      set.status = 404
      return { error: { code: 'SLOT_001', message: 'Time slot not found' } }
    }
    return { timeSlot }
  }, {
    body: t.Object({
      name:        t.Optional(t.String()),
      meal:        t.Optional(t.String()),
      startTime:   t.Optional(t.String()),
      endTime:     t.Optional(t.String()),
      capacity:    t.Optional(t.Number()),
      cutoffHours: t.Optional(t.Number()),
      description: t.Optional(t.String()),
      enabled:     t.Optional(t.Boolean()),
    }),
  })

  .delete('/time-slots/:id', async ({ params, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const timeSlot = await BookingTimeSlot.findByIdAndDelete(params.id)
    if (!timeSlot) {
      set.status = 404
      return { error: { code: 'SLOT_001', message: 'Time slot not found' } }
    }
    return { ok: true }
  })

  // ── Booking Config (/booking/config) ─────────────────────────────────────────

  .get('/config', async () => {
    const config = await BookingConfig.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: { openDays: [1,2,3,4,5] } },
      { upsert: true, new: true },
    ).lean()
    return { config: { key: config!.key, openDays: config!.openDays } }
  })

  .patch('/config', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const config = await BookingConfig.findOneAndUpdate(
      { key: 'default' },
      { $set: { openDays: body.openDays } },
      { upsert: true, new: true },
    ).lean()
    return { config: { key: config!.key, openDays: config!.openDays } }
  }, {
    body: t.Object({ openDays: t.Array(t.Number()) }),
  })

  // ── Booking Blackouts (/booking/blackouts) ────────────────────────────────────

  .get('/blackouts', async () => {
    const blackouts = await BookingBlackout.find().sort({ date: 1 }).lean()
    return {
      blackouts: blackouts.map(b => ({
        id:      String(b._id),
        date:    b.date,
        endDate: b.endDate,
        reason:  b.reason,
      })),
    }
  })

  .post('/blackouts', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const blackout = await BookingBlackout.create({
      date:    body.date,
      endDate: body.endDate,
      reason:  body.reason ?? '',
    })
    return {
      blackout: {
        id:      String(blackout._id),
        date:    blackout.date,
        endDate: blackout.endDate,
        reason:  blackout.reason,
      },
    }
  }, {
    body: t.Object({
      date:    t.String(),
      endDate: t.Optional(t.String()),
      reason:  t.Optional(t.String()),
    }),
  })

  .delete('/blackouts/:id', async ({ params, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    const blackout = await BookingBlackout.findByIdAndDelete(params.id)
    if (!blackout) {
      set.status = 404
      return { error: { code: 'BLACKOUT_001', message: 'Blackout not found' } }
    }
    return { ok: true }
  })
