import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import {
  BuffetPricing, BuffetConfig, BuffetBlackout, BuffetRound,
  BuffetSession, BuffetCategory, Wallet, Transaction, AuditLog, User,
} from '../../models'

function genRefNo(prefix = 'TXN') {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `${prefix}${date}-${rand}`
}

export const buffetController = new Elysia({ prefix: '/buffet' })
  .use(authPlugin(['admin', 'supervisor']))

  // ── BuffetRound CRUD ──────────────────────────────────────────────────────────

  .get('/rounds', async () => {
    const rounds = await BuffetRound.find().sort({ sortOrder: 1, startTime: 1 }).lean()
    return { rounds: rounds.map(r => ({ ...r, id: String(r._id) })) }
  })

  .post('/rounds', async ({ body, set }) => {
    try {
      const count = await BuffetRound.countDocuments()
      const round = await BuffetRound.create({
        name:      body.name,
        startTime: body.startTime,
        endTime:   body.endTime,
        active:    body.active ?? true,
        sortOrder: body.sortOrder ?? count,
      })
      return { round: { ...round.toObject(), id: String(round._id) } }
    } catch (err: unknown) {
      set.status = 400
      return { error: { code: 'ROUND_001', message: err instanceof Error ? err.message : 'Create failed' } }
    }
  }, {
    body: t.Object({
      name:      t.String(),
      startTime: t.String(),
      endTime:   t.String(),
      active:    t.Optional(t.Boolean()),
      sortOrder: t.Optional(t.Number()),
    }),
  })

  .patch('/rounds/:id', async ({ params, body, set }) => {
    const round = await BuffetRound.findByIdAndUpdate(
      params.id,
      { $set: {
        ...(body.name      !== undefined && { name:      body.name }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.endTime   !== undefined && { endTime:   body.endTime }),
        ...(body.active    !== undefined && { active:    body.active }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      }},
      { new: true },
    ).lean()
    if (!round) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Round not found' } } }
    return { round: { ...round, id: String(round._id) } }
  }, {
    body: t.Object({
      name:      t.Optional(t.String()),
      startTime: t.Optional(t.String()),
      endTime:   t.Optional(t.String()),
      active:    t.Optional(t.Boolean()),
      sortOrder: t.Optional(t.Number()),
    }),
  })

  .delete('/rounds/:id', async ({ params, set }) => {
    const result = await BuffetRound.findByIdAndDelete(params.id)
    if (!result) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Round not found' } } }
    return { ok: true }
  })

  // ── Pricing CRUD ──────────────────────────────────────────────────────────────

  .get('/pricing', async () => {
    const pricing = await BuffetPricing.find()
      .populate('gradeLevelId', 'code name sortOrder')
      .populate('buffetRoundId', 'name startTime endTime')
      .populate('categoryIds', 'name')
      .sort({ userType: 1, effectiveFrom: -1 })
      .lean()
    return {
      pricing: pricing.map(p => ({
        ...p,
        id:            String(p._id),
        gradeLevelId:  p.gradeLevelId ? String((p.gradeLevelId as any)._id) : null,
        gradeLevel:    p.gradeLevelId ?? null,
        buffetRoundId: p.buffetRoundId ? String((p.buffetRoundId as any)._id) : null,
        buffetRound:   p.buffetRoundId ?? null,
        categoryIds:   ((p as any).categoryIds ?? []).map((c: any) => String(c._id ?? c)),
        categories:    (p as any).categoryIds ?? [],
      })),
    }
  })

  .post('/pricing', async ({ body, set }) => {
    try {
      const record = await BuffetPricing.create({
        userType:      body.userType,
        gradeLevelId:  body.gradeLevelId ?? null,
        buffetRoundId: body.buffetRoundId ?? null,
        categoryIds:   body.categoryIds ?? [],
        price:         body.price,
        effectiveFrom: new Date(body.effectiveFrom),
        effectiveTo:   body.effectiveTo ? new Date(body.effectiveTo) : null,
      })
      return { pricing: { ...record.toObject(), id: String(record._id) } }
    } catch (err: unknown) {
      set.status = 400
      return { error: { code: 'PRICING_001', message: err instanceof Error ? err.message : 'Create failed' } }
    }
  }, {
    body: t.Object({
      userType:      t.Union([t.Literal('member'), t.Literal('student')]),
      gradeLevelId:  t.Optional(t.Nullable(t.String())),
      buffetRoundId: t.Optional(t.Nullable(t.String())),
      categoryIds:   t.Optional(t.Array(t.String())),
      price:         t.Number(),
      effectiveFrom: t.String(),
      effectiveTo:   t.Optional(t.Nullable(t.String())),
    }),
  })

  .patch('/pricing/:id', async ({ params, body, set }) => {
    const record = await BuffetPricing.findByIdAndUpdate(
      params.id,
      { $set: {
        ...(body.userType      !== undefined && { userType:      body.userType }),
        ...(body.gradeLevelId  !== undefined && { gradeLevelId:  body.gradeLevelId ?? null }),
        ...(body.buffetRoundId !== undefined && { buffetRoundId: body.buffetRoundId ?? null }),
        ...(body.categoryIds   !== undefined && { categoryIds:   body.categoryIds }),
        ...(body.price         !== undefined && { price:         body.price }),
        ...(body.effectiveFrom !== undefined && { effectiveFrom: new Date(body.effectiveFrom) }),
        ...(body.effectiveTo   !== undefined && { effectiveTo:   body.effectiveTo ? new Date(body.effectiveTo) : null }),
      }},
      { new: true },
    ).lean()
    if (!record) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Pricing not found' } } }
    return { pricing: { ...record, id: String(record._id) } }
  }, {
    body: t.Object({
      userType:      t.Optional(t.Union([t.Literal('member'), t.Literal('student')])),
      gradeLevelId:  t.Optional(t.Nullable(t.String())),
      buffetRoundId: t.Optional(t.Nullable(t.String())),
      categoryIds:   t.Optional(t.Array(t.String())),
      price:         t.Optional(t.Number()),
      effectiveFrom: t.Optional(t.String()),
      effectiveTo:   t.Optional(t.Nullable(t.String())),
    }),
  })

  .delete('/pricing/:id', async ({ params, set }) => {
    const result = await BuffetPricing.findByIdAndDelete(params.id)
    if (!result) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Pricing not found' } } }
    return { ok: true }
  })

  // ── BuffetCategory CRUD ───────────────────────────────────────────────────────

  .get('/categories', async () => {
    const categories = await (BuffetCategory as any).find()
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    return {
      categories: categories.map((c: any) => ({
        id: String(c._id), code: c.code, name: c.name,
        active: c.active, sortOrder: c.sortOrder,
      })),
    }
  })

  .post('/categories', async ({ body, set }) => {
    try {
      const count    = await (BuffetCategory as any).countDocuments()
      const category = await (BuffetCategory as any).create({
        code:      body.code,
        name:      body.name,
        active:    body.active ?? true,
        sortOrder: body.sortOrder ?? count,
      })
      return { category: { ...category.toObject(), id: String(category._id) } }
    } catch (err: unknown) {
      set.status = 400
      return { error: { code: 'CATEGORY_001', message: err instanceof Error ? err.message : 'Create failed' } }
    }
  }, {
    body: t.Object({
      code:      t.String(),
      name:      t.String(),
      active:    t.Optional(t.Boolean()),
      sortOrder: t.Optional(t.Number()),
    }),
  })

  .patch('/categories/:id', async ({ params, body, set }) => {
    const update: any = {}
    if (body.code      !== undefined) update.code      = body.code
    if (body.name      !== undefined) update.name      = body.name
    if (body.active    !== undefined) update.active    = body.active
    if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder

    const category = await (BuffetCategory as any).findByIdAndUpdate(
      params.id, { $set: update }, { new: true },
    ).lean()
    if (!category) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Category not found' } } }
    return { category: { ...category, id: String(category._id) } }
  }, {
    body: t.Object({
      code:      t.Optional(t.String()),
      name:      t.Optional(t.String()),
      active:    t.Optional(t.Boolean()),
      sortOrder: t.Optional(t.Number()),
    }),
  })

  .delete('/categories/:id', async ({ params, set }) => {
    const result = await (BuffetCategory as any).findByIdAndDelete(params.id)
    if (!result) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Category not found' } } }
    return { ok: true }
  })

  // ── Weekly Config ─────────────────────────────────────────────────────────────

  .get('/config', async () => {
    let config = await BuffetConfig.findOne({ key: 'default' }).lean()
    if (!config) config = await BuffetConfig.create({ key: 'default', openDays: [1,2,3,4,5] })
    return { config }
  })

  .patch('/config', async ({ body }) => {
    const config = await BuffetConfig.findOneAndUpdate(
      { key: 'default' },
      { $set: { openDays: body.openDays } },
      { new: true, upsert: true },
    ).lean()
    return { config }
  }, {
    body: t.Object({ openDays: t.Array(t.Number()) }),
  })

  // ── Blackout dates ────────────────────────────────────────────────────────────

  .get('/blackouts', async () => {
    const blackouts = await BuffetBlackout.find().sort({ date: 1 }).lean()
    return { blackouts: blackouts.map(b => ({ ...b, id: String(b._id) })) }
  })

  .post('/blackouts', async ({ body }) => {
    const blackout = await BuffetBlackout.create({
      date:    body.date,
      endDate: body.endDate ?? undefined,
      reason:  body.reason ?? '',
    })
    return { blackout: { ...blackout.toObject(), id: String(blackout._id) } }
  }, {
    body: t.Object({
      date:    t.String(),
      endDate: t.Optional(t.String()),
      reason:  t.Optional(t.String()),
    }),
  })

  .delete('/blackouts/:id', async ({ params, set }) => {
    const result = await BuffetBlackout.findByIdAndDelete(params.id)
    if (!result) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Blackout not found' } } }
    return { ok: true }
  })

  // ── History (paginated, filterable) ──────────────────────────────────────────

  .get('/history', async ({ query }) => {
    const page  = Math.max(1, parseInt(query.page  ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
    const skip  = (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (query.startDate && query.endDate) {
      filter.entryDate = { $gte: query.startDate, $lte: query.endDate }
    } else if (query.date) {
      filter.entryDate = query.date
    }

    if (query.roundId) filter.buffetRoundId = query.roundId

    const allSessions = await BuffetSession
      .find(filter)
      .populate('userId', 'firstName lastName uid')
      .populate('buffetRoundId', 'name startTime endTime')
      .sort({ enteredAt: -1 })
      .lean()

    let sessions = allSessions
    if (query.search) {
      const s = query.search.toLowerCase()
      sessions = allSessions.filter(session => {
        const u = session.userId as any
        const name = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.toLowerCase()
        const uid  = (u?.uid ?? '').toLowerCase()
        return name.includes(s) || uid.includes(s)
      })
    }

    const total        = sessions.length
    const totalRevenue = sessions.reduce((sum, s) => sum + (s.priceCharged ?? 0), 0)
    const page_data    = sessions.slice(skip, skip + limit)

    return {
      sessions: page_data.map(s => {
        const u = s.userId as any
        const r = s.buffetRoundId as any
        return {
          id:          String(s._id),
          studentName: `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim(),
          uid:         u?.uid ?? '',
          roundId:     String(r?._id ?? s.buffetRoundId),
          roundName:   r?.name ? `${r.name} (${r.startTime}–${r.endTime})` : '—',
          entryDate:   s.entryDate,
          enteredAt:   s.enteredAt,
          price:       s.priceCharged,
          status:      s.voidedAt ? 'voided' : 'active',
          payMethod:   s.payMethod,
        }
      }),
      total,
      totalRevenue,
      page,
      limit,
    }
  }, {
    query: t.Object({
      date:      t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate:   t.Optional(t.String()),
      roundId:   t.Optional(t.String()),
      search:    t.Optional(t.String()),
      page:      t.Optional(t.String()),
      limit:     t.Optional(t.String()),
    }),
  })

  // ── Usage dashboard ───────────────────────────────────────────────────────────

  .get('/usage', async ({ query }) => {
    const date   = query.date ?? new Date().toISOString().split('T')[0]
    const rounds = await BuffetRound.find().sort({ sortOrder: 1, startTime: 1 }).lean()

    const sessions = await BuffetSession.find({ entryDate: date, voidedAt: null })
      .populate('userId', 'firstName lastName uid')
      .populate('buffetRoundId', 'name startTime endTime')
      .lean()

    const breakdown = rounds.map(r => {
      const rs = sessions.filter(s => String((s.buffetRoundId as any)?._id ?? s.buffetRoundId) === String(r._id))
      return {
        roundId:   String(r._id),
        roundName: `${r.name} (${r.startTime}–${r.endTime})`,
        count:     rs.length,
        revenue:   rs.reduce((sum, s) => sum + (s.priceCharged ?? 0), 0),
        sessions:  rs.map(s => ({
          id:            String(s._id),
          studentName:   `${(s.userId as any)?.firstName ?? ''} ${(s.userId as any)?.lastName ?? ''}`.trim(),
          uid:           (s.userId as any)?.uid ?? '',
          price:         s.priceCharged,
          enteredAt:     s.enteredAt,
          transactionId: s.transactionId,
        })),
      }
    })

    return {
      date,
      totalCount:   sessions.length,
      totalRevenue: sessions.reduce((sum, s) => sum + (s.priceCharged ?? 0), 0),
      breakdown,
    }
  }, {
    query: t.Object({ date: t.Optional(t.String()) }),
  })

  // ── Void session ──────────────────────────────────────────────────────────────

  .post('/sessions/:id/void', async ({ params, body, currentUser, set }) => {
    // Verify supervisor code
    const supervisor = await User.findOne({
      uid:  body.supervisorCode,
      role: { $in: ['supervisor', 'admin'] },
    }).lean()
    if (!supervisor) {
      set.status = 401
      return { error: { code: 'UNAUTHORIZED', message: 'รหัสซุปเปอร์ไวเซอร์ไม่ถูกต้อง' } }
    }

    const session = await BuffetSession.findById(params.id)
    if (!session) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Session not found' } }
    }
    if (session.voidedAt) {
      set.status = 409
      return { error: { code: 'ALREADY_VOIDED', message: 'Session ถูกยกเลิกไปแล้ว' } }
    }

    const wallet = await Wallet.findOne({ userId: session.userId })
    if (!wallet) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Wallet not found' } }
    }

    wallet.balance = (wallet.balance ?? 0) + session.priceCharged
    wallet.version = (wallet.version ?? 0) + 1
    await wallet.save()

    await Transaction.create({
      refNo:         genRefNo('VOID'),
      walletId:      wallet._id,
      type:          'refund',
      amount:        session.priceCharged,
      balanceAfter:  wallet.balance,
      channel:       'admin',
      paymentMethod: 'void',
      status:        'success',
      note:          `Void buffet: ${body.reason}`,
    })

    // soft-delete: เก็บ record ไว้เพื่อ audit แต่ mark ว่า voided
    session.voidedAt   = new Date()
    session.voidReason = body.reason
    await session.save()

    await AuditLog.create({
      actorUserId:  currentUser._id,
      actorRole:    currentUser.role,
      action:       'buffet_session.void',
      entityType:   'BuffetSession',
      entityId:     String(session._id),
      beforeData:   { priceCharged: session.priceCharged, entryDate: session.entryDate },
      reason:       body.reason,
    })

    return { ok: true, refundAmount: session.priceCharged }
  }, {
    body: t.Object({
      reason:         t.String(),
      supervisorCode: t.String(),
    }),
  })

  // ── Manual tap (admin bypass when POS card tap fails) ─────────────────────────

  .post('/sessions/manual', async ({ body, currentUser, set }) => {
    const supervisor = await User.findOne({
      uid:  body.supervisorCode,
      role: { $in: ['supervisor', 'admin'] },
    }).lean()
    if (!supervisor) {
      set.status = 401
      return { error: { code: 'UNAUTHORIZED', message: 'รหัสซุปเปอร์ไวเซอร์ไม่ถูกต้อง' } }
    }

    const user = await User.findOne({ uid: body.uid }).lean()
    if (!user) {
      set.status = 404
      return { error: { code: 'USER_NOT_FOUND', message: 'ไม่พบผู้ใช้งาน UID: ' + body.uid } }
    }

    const round = await BuffetRound.findById(body.buffetRoundId).lean()
    if (!round) {
      set.status = 404
      return { error: { code: 'ROUND_NOT_FOUND', message: 'ไม่พบรอบ Buffet' } }
    }

    const entryDate = body.entryDate

    const existing = await BuffetSession.findOne({
      userId: user._id,
      buffetRoundId: round._id,
      entryDate,
      voidedAt: null,
    }).lean()
    if (existing) {
      set.status = 409
      return { error: { code: 'ALREADY_ENTERED', message: 'ผู้ใช้นี้มีประวัติการเข้าใช้รอบนี้แล้ว' } }
    }

    const userType = (user as any).role === 'parent' ? 'member' : 'student'

    if (body.buffetCategoryId) {
      const catExists = await (BuffetCategory as any).exists({ _id: body.buffetCategoryId })
      if (!catExists) {
        set.status = 404
        return { error: { code: 'CATEGORY_NOT_FOUND', message: 'ไม่พบประเภทอาหาร' } }
      }
    }

    const pricingQuery: any = {
      userType,
      $and: [
        { $or: [{ buffetRoundId: round._id }, { buffetRoundId: null }] },
        { effectiveFrom: { $lte: new Date(entryDate) } },
        { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date(entryDate) } }] },
      ],
    }
    const pricing = await (BuffetPricing as any).findOne(pricingQuery).sort({ buffetRoundId: -1 }).lean()
    if (!pricing) {
      set.status = 400
      return { error: { code: 'NO_PRICING', message: 'ไม่พบราคา Buffet สำหรับผู้ใช้นี้' } }
    }
    const price = (pricing as any).price
    const wallet = await Wallet.findOne({ userId: user._id })
    if (!wallet) {
      set.status = 404
      return { error: { code: 'NO_WALLET', message: 'ไม่พบ Wallet ของผู้ใช้' } }
    }
    if (wallet.balance < price) {
      set.status = 400
      return { error: { code: 'INSUFFICIENT', message: `ยอดเงินไม่พอ (มี ฿${wallet.balance} ต้องการ ฿${price})` } }
    }

    wallet.balance  = (wallet.balance ?? 0) - price
    wallet.version  = (wallet.version ?? 0) + 1
    await wallet.save()

    const refNo = genRefNo('MBUF')
    const txn = await Transaction.create({
      refNo,
      walletId:        wallet._id,
      type:            'buffet',
      amount:          -price,
      balanceAfter:    wallet.balance,
      channel:         'admin',
      paymentMethod:   'manual',
      status:          'success',
      note:            body.note ? `Manual tap: ${body.note}` : 'Manual tap by admin',
    })

    const session = await BuffetSession.create({
      userId:           user._id,
      buffetRoundId:    round._id,
      buffetCategoryId: body.buffetCategoryId ?? undefined,
      entryDate,
      priceCharged:     price,
      payMethod:        'manual',
      transactionId:    txn._id,
      enteredAt:        new Date(),
    })

    await AuditLog.create({
      actorUserId: currentUser._id,
      actorRole:   currentUser.role,
      action:      'buffet_session.manual',
      entityType:  'BuffetSession',
      entityId:    String(session._id),
      beforeData:  {},
      reason:      body.note ?? 'Manual tap',
    })

    return { ok: true, sessionId: String(session._id), price }
  }, {
    body: t.Object({
      uid:              t.String(),
      buffetRoundId:    t.String(),
      buffetCategoryId: t.Optional(t.String()),
      entryDate:        t.String(),
      supervisorCode:   t.String(),
      note:             t.Optional(t.String()),
    }),
  })
