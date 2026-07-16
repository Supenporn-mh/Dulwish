import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Order, MenuItem, MealPeriod, Wallet, Transaction, ParentStudent, Shop, User } from '../../models'

function genOrderNo() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `ORD${date}-${rand}`
}

function genRefNo() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `TXN${date}-${rand}`
}

export const ordersController = new Elysia({ prefix: '/orders' })
  .use(authPlugin())

  .post('/', async ({ body, currentUser, set }) => {
    // Validate serve date (today + 7 days)
    const today = new Date(); today.setHours(0,0,0,0)
    const serve = new Date(body.serve_date); serve.setHours(0,0,0,0)
    const diff = Math.floor((serve.getTime() - today.getTime()) / 86400000)
    if (diff < 0 || diff > 7) {
      set.status = 400
      return { error: { code: 'ORDER_003', message: 'serve_date must be today to today+7' } }
    }

    const period = await MealPeriod.findById(body.meal_period_id).lean()
    if (!period) { set.status = 400; return { error: { code: 'ORDER_003', message: 'Invalid meal period' } } }

    // Cutoff check
    const [h, m] = period.startTime.split(':').map(Number)
    const periodStart = new Date(body.serve_date)
    periodStart.setHours(h, m, 0, 0)
    const cutoff = new Date(periodStart.getTime() - period.cutoffMinutes * 60 * 1000)
    if (new Date() >= cutoff) {
      set.status = 400
      return { error: { code: 'ORDER_001', message: 'Order cutoff passed' } }
    }

    // Resolve items
    const menuIds = body.items.map((i: any) => i.menu_item_id)
    const menuItems = await MenuItem.find({ _id: { $in: menuIds }, active: true, isPreorderable: true }).lean()
    let total = 0
    const lineItems: any[] = []
    for (const item of body.items) {
      const menu = menuItems.find(m => String(m._id) === item.menu_item_id)
      if (!menu) {
        set.status = 400
        return { error: { code: 'ORDER_005', message: `Item not preorderable: ${item.menu_item_id}` } }
      }
      const lineTotal = menu.price * item.qty
      total += lineTotal
      lineItems.push({
        menuItemId: menu._id,
        qty: item.qty,
        unitPrice: menu.price,
        lineTotal,
        note: item.note,
      })
    }

    // Wallet deduction
    const studentId = body.student_user_id ?? String(currentUser._id)
    const student = await User.findById(studentId).select('uid firstName lastName displayName').lean()
    const wallet = await Wallet.findOne({ userId: studentId })
    if (!wallet) { set.status = 400; return { error: { code: 'WALLET_001', message: 'Wallet not found' } } }
    if (wallet.balance - total < -wallet.negativeLimit) {
      set.status = 400
      return { error: { code: 'WALLET_001', message: 'Insufficient balance' } }
    }

    wallet.balance -= total
    wallet.version += 1
    await wallet.save()

    const refNo = genRefNo()
    const txn = await Transaction.create({
      refNo,
      walletId: wallet._id,
      type: 'purchase',
      amount: -total,
      balanceAfter: wallet.balance,
      channel: 'mobile_web',
      paymentMethod: 'card_wallet',
      status: 'success',
      items: lineItems.map((li: any) => {
        const menu = menuItems.find(m => String(m._id) === String(li.menuItemId))
        return {
          name:      menu?.name ?? '',
          qty:       li.qty,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
        }
      }),
    })

    const order = await Order.create({
      orderNo: genOrderNo(),
      studentUserId: studentId,
      parentUserId: currentUser.role === 'parent' ? currentUser._id : undefined,
      shopId: body.shop_id,
      mealPeriodId: period._id,
      serveDate: body.serve_date,
      totalAmount: total,
      status: 'confirmed',
      items: lineItems,
      transactionId: txn._id,
      note: body.note ?? '',
      studentNameSnap: student ? (student.displayName || `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()) : undefined,
      studentCodeSnap: student?.uid,
    })

    return { order, transaction: txn }
  }, {
    body: t.Object({
      student_user_id: t.Optional(t.String()),
      shop_id:         t.String(),
      meal_period_id:  t.String(),
      serve_date:      t.String(),
      note:            t.Optional(t.String()),
      items: t.Array(t.Object({
        menu_item_id: t.String(),
        qty:          t.Number(),
        note:         t.Optional(t.String()),
      })),
    }),
  })

  .get('/', async ({ query, currentUser }) => {
    const filter: any = {}
    if (currentUser.role === 'parent') {
      // Get student IDs linked to this parent
      const { ParentStudent } = await import('../../models')
      const links = await ParentStudent.find({ parentUserId: currentUser._id }).lean()
      filter.studentUserId = { $in: links.map(l => l.studentUserId) }
    } else if (currentUser.role === 'student') {
      filter.studentUserId = currentUser._id
    }
    if (query.student) filter.studentUserId = query.student
    if (query.from)    filter.serveDate = { $gte: query.from }
    if (query.to)      filter.serveDate = { ...filter.serveDate, $lte: query.to }
    if (query.createdFrom) filter.createdAt = { $gte: new Date(query.createdFrom) }
    if (query.createdTo)   filter.createdAt = { ...filter.createdAt, $lte: new Date(query.createdTo) }
    if (query.status)  filter.status = query.status

    const orders = await Order.find(filter)
      .populate('items.menuItemId', 'name')
      .sort({ createdAt: -1 }).limit(500).lean()
    // Enrich with student + meal period names so admin/parent UIs can display
    const studentIds = [...new Set(orders.map(o => String(o.studentUserId)))]
    const periodIds  = [...new Set(orders.map(o => String(o.mealPeriodId)))]
    const [students, periods] = await Promise.all([
      User.find({ _id: { $in: studentIds } }).select('uid firstName lastName displayName deletedAt').lean(),
      MealPeriod.find({ _id: { $in: periodIds } }).select('code name startTime endTime').lean(),
    ])
    const enriched = orders.map(o => {
      const s = students.find(x => String(x._id) === String(o.studentUserId))
      const p = periods.find(x => String(x._id) === String(o.mealPeriodId))
      return {
        ...o,
        items: (o.items ?? []).map((i: any) => ({ ...i, name: i.menuItemId?.name ?? '' })),
        studentName: s ? (s.displayName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim()) : '',
        studentCode: s?.uid ?? '',
        studentDeletedAt: s?.deletedAt ?? null,
        mealPeriodName: p?.name ?? '',
        mealPeriodCode: p?.code ?? '',
        mealPeriodTime: p ? `${p.startTime}-${p.endTime}` : '',
      }
    })
    return { orders: enriched }
  }, {
    query: t.Object({
      student:     t.Optional(t.String()),
      from:        t.Optional(t.String()),
      to:          t.Optional(t.String()),
      createdFrom: t.Optional(t.String()),
      createdTo:   t.Optional(t.String()),
      status:      t.Optional(t.String()),
    }),
  })

  .get('/stats', async ({ query }) => {
    try {
      const date = query.date
      if (!date) return { stats: [] }
      const orders = await Order.find({ serveDate: date, status: { $ne: 'cancelled' } })
        .select('mealPeriodId')
        .lean()
      const countMap: Record<string, number> = {}
      for (const o of orders) {
        const key = String(o.mealPeriodId)
        countMap[key] = (countMap[key] ?? 0) + 1
      }
      const stats = Object.entries(countMap).map(([mealPeriodId, count]) => ({ mealPeriodId, count }))
      return { stats }
    } catch (err: any) {
      return { stats: [], error: err?.message }
    }
  }, {
    query: t.Object({ date: t.Optional(t.String()) }),
  })

  .get('/:id', async ({ params }) => {
    const order = await Order.findById(params.id).lean()
    return { order }
  })

  .patch('/:id/cancel', async ({ params, body, currentUser, set }) => {
    const order = await Order.findById(params.id)
    if (!order) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Order not found' } } }
    if (!['confirmed','pending_payment'].includes(order.status)) {
      set.status = 400
      return { error: { code: 'ORDER_004', message: `Cannot cancel order with status: ${order.status}` } }
    }

    // Refund wallet
    const wallet = await Wallet.findOne({ userId: order.studentUserId })
    if (wallet && order.transactionId) {
      wallet.balance += order.totalAmount
      wallet.version += 1
      await wallet.save()

      const originalTxn = await Transaction.findById(order.transactionId).select('items').lean()

      await Transaction.create({
        refNo: genRefNo(),
        walletId: wallet._id,
        type: 'refund',
        amount: order.totalAmount,
        balanceAfter: wallet.balance,
        channel: 'mobile_web',
        paymentMethod: 'card_wallet',
        status: 'success',
        relatedOrderId: order._id,
        note: body.reason,
        items: originalTxn?.items ?? [],
      })
    }

    order.status = 'cancelled'
    order.cancelledAt = new Date()
    order.cancelReason = body.reason
    await order.save()
    return { success: true, order }
  }, {
    body: t.Object({ reason: t.String() }),
  })
