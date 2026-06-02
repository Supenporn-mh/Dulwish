import { Elysia, t } from 'elysia'
import mongoose from 'mongoose'
import { authPlugin } from '../../middleware/auth'
import { Order, MenuItem, MealPeriod, Wallet, Transaction, ParentStudent, Shop } from '../../models'

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
    const session = await mongoose.startSession()
    let result: any
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userId: studentId }).session(session)
      if (!wallet) throw new Error('Wallet not found')
      if (wallet.balance - total < -wallet.negativeLimit)
        throw Object.assign(new Error('Insufficient balance'), { code: 'WALLET_001' })

      wallet.balance -= total
      wallet.version += 1
      await wallet.save({ session })

      const refNo = genRefNo()
      const txn = await Transaction.create([{
        refNo,
        walletId: wallet._id,
        type: 'purchase',
        amount: -total,
        balanceAfter: wallet.balance,
        channel: 'mobile_web',
        paymentMethod: 'card_wallet',
        status: 'success',
      }], { session })

      const order = await Order.create([{
        orderNo: genOrderNo(),
        studentUserId: studentId,
        parentUserId: currentUser.role === 'parent' ? currentUser._id : undefined,
        shopId: body.shop_id,
        mealPeriodId: period._id,
        serveDate: body.serve_date,
        totalAmount: total,
        status: 'confirmed',
        items: lineItems,
        transactionId: txn[0]._id,
      }], { session })

      result = { order: order[0], transaction: txn[0] }
    })
    session.endSession()
    return result
  }, {
    body: t.Object({
      student_user_id: t.Optional(t.String()),
      shop_id:         t.String(),
      meal_period_id:  t.String(),
      serve_date:      t.String(),
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
    if (query.status)  filter.status = query.status

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(50).lean()
    return { orders }
  }, {
    query: t.Object({
      student: t.Optional(t.String()),
      from:    t.Optional(t.String()),
      to:      t.Optional(t.String()),
      status:  t.Optional(t.String()),
    }),
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

    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      // Refund wallet
      const wallet = await Wallet.findOne({ userId: order.studentUserId }).session(session)
      if (wallet && order.transactionId) {
        wallet.balance += order.totalAmount
        wallet.version += 1
        await wallet.save({ session })
      }

      order.status = 'cancelled'
      order.cancelledAt = new Date()
      order.cancelReason = body.reason
      await order.save({ session })
    })
    session.endSession()
    return { success: true, order }
  }, {
    body: t.Object({ reason: t.String() }),
  })
