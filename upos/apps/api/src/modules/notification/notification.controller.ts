import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Notification } from '../../models'

export const notificationController = new Elysia({ prefix: '/notifications' })
  .use(authPlugin())

  .get('/', async ({ query, currentUser }) => {
    const filter: any = { userId: currentUser._id }
    if (query.unread === 'true') filter.read = false
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).lean()
    return { notifications }
  }, {
    query: t.Object({
      unread: t.Optional(t.String()),
    }),
  })

  .post('/', async ({ body, currentUser, set }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Forbidden' } }
    }
    const notification = await Notification.create(body)
    return { notification }
  }, {
    body: t.Object({
      userId: t.String(),
      type:   t.Optional(t.String()),
      title:  t.String(),
      body:   t.Optional(t.String()),
      action: t.Optional(t.String()),
    }),
  })

  .patch('/read-all', async ({ currentUser }) => {
    const result = await Notification.updateMany(
      { userId: currentUser._id, read: false },
      { $set: { read: true, readAt: new Date() } },
    )
    return { ok: true, modified: result.modifiedCount }
  })

  .patch('/:id/read', async ({ params, currentUser, set }) => {
    const notification = await Notification.findById(params.id)
    if (!notification) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Notification not found' } }
    }
    if (String(notification.userId) !== String(currentUser._id)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Forbidden' } }
    }
    notification.read = true
    notification.readAt = new Date()
    await notification.save()
    return { notification: notification.toObject() }
  })
