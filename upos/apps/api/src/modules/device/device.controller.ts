import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Device } from '../../models'

export const deviceController = new Elysia({ prefix: '/devices' })
  .use(authPlugin(['admin', 'supervisor']))

  .get('/', async ({ query }) => {
    const filter: any = {}
    if (query.branchCode) filter.branchCode = query.branchCode
    const devices = await Device.find(filter).sort({ createdAt: -1 }).lean()
    return { devices }
  }, {
    query: t.Object({
      branchCode: t.Optional(t.String()),
    }),
  })

  .post('/', async ({ body, set }) => {
    const existing = await Device.findOne({ deviceId: body.deviceId }).lean()
    if (existing) {
      set.status = 400
      return { error: { code: 'DEVICE_001', message: 'Device ID already exists' } }
    }
    const device = await Device.create(body)
    return { device }
  }, {
    body: t.Object({
      deviceId:   t.String(),
      name:       t.String(),
      type:       t.Optional(t.Union([t.Literal('pos'), t.Literal('kiosk'), t.Literal('tablet'), t.Literal('printer'), t.Literal('other')])),
      branchCode: t.Optional(t.String()),
      status:     t.Optional(t.Union([t.Literal('active'), t.Literal('inactive')])),
      lastSeenAt: t.Optional(t.String()),
      note:       t.Optional(t.String()),
    }),
  })

  .patch('/:id', async ({ params, body, set }) => {
    const device = await Device.findByIdAndUpdate(params.id, { $set: body }, { new: true }).lean()
    if (!device) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Device not found' } }
    }
    return { device }
  }, {
    body: t.Object({
      name:       t.Optional(t.String()),
      type:       t.Optional(t.Union([t.Literal('pos'), t.Literal('kiosk'), t.Literal('tablet'), t.Literal('printer'), t.Literal('other')])),
      branchCode: t.Optional(t.String()),
      status:     t.Optional(t.Union([t.Literal('active'), t.Literal('inactive')])),
      lastSeenAt: t.Optional(t.String()),
      note:       t.Optional(t.String()),
    }),
  })

  .delete('/:id', async ({ params, set }) => {
    const deleted = await Device.findByIdAndDelete(params.id)
    if (!deleted) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Device not found' } }
    }
    return { ok: true }
  })
