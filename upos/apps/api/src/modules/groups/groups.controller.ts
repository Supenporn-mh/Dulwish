import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { MemberGroup, User, Card } from '../../models'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Shape a raw MemberGroup doc into the wire format the portal expects. */
function formatGroup(g: any) {
  return {
    id:          g.code,
    name:        g.name,
    kind:        g.kind,
    permissions: g.permissions ?? [],
    memberCount: (g.members ?? []).length,
  }
}

/**
 * Shape a populated member entry.
 * The portal GroupDetailView expects: { id, name, cardSn, joinedAt }
 */
function formatMember(entry: { userId: any; joinedAt?: Date }, user: any, card: any) {
  return {
    userId:   user?._id?.toString() ?? entry.userId?.toString(),
    id:       user?.uid ?? user?._id?.toString() ?? entry.userId?.toString(),
    name:     user ? `${user.firstName} ${user.lastName}` : '',
    email:    user?.email ?? '',
    cardSn:   card?.cardUid ?? '',
    joinedAt: entry.joinedAt ? entry.joinedAt.toISOString() : null,
  }
}

// ── Controller ─────────────────────────────────────────────────────────────────

export const groupsController = new Elysia({ prefix: '/groups' })
  .use(authPlugin())

  // ── GET /groups  (optional ?kind=member|student) ──────────────────────────
  .get('/', async ({ query }) => {
    const filter: any = {}
    if (query.kind) filter.kind = query.kind

    const groups = await MemberGroup.find(filter).lean()
    return { groups: groups.map(formatGroup) }
  }, {
    query: t.Object({
      kind: t.Optional(t.String()),
    }),
  })

  // ── POST /groups ───────────────────────────────────────────────────────────
  .post('/', async ({ body, set, currentUser }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const group = await MemberGroup.create({
      code:        body.id,
      name:        body.name,
      kind:        body.kind ?? 'member',
      permissions: body.permissions ?? [],
      members:     [],
    })
    return { group: formatGroup(group.toObject()) }
  }, {
    body: t.Object({
      id:          t.String(),
      name:        t.String(),
      kind:        t.Optional(t.String()),
      permissions: t.Optional(t.Array(t.String())),
    }),
  })

  // ── PATCH /groups/:code ────────────────────────────────────────────────────
  .patch('/:code', async ({ params, body, set, currentUser }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const update: any = {}
    if (body.name        !== undefined) update.name        = body.name
    if (body.permissions !== undefined) update.permissions = body.permissions

    const group = await MemberGroup.findOneAndUpdate(
      { code: params.code },
      update,
      { new: true },
    ).lean()

    if (!group) {
      set.status = 404
      return { error: { code: 'GRP_001', message: 'Group not found' } }
    }
    return { group: formatGroup(group) }
  }, {
    body: t.Object({
      name:        t.Optional(t.String()),
      permissions: t.Optional(t.Array(t.String())),
    }),
  })

  // ── DELETE /groups/:code ───────────────────────────────────────────────────
  .delete('/:code', async ({ params, set, currentUser }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const result = await MemberGroup.findOneAndDelete({ code: params.code })
    if (!result) {
      set.status = 404
      return { error: { code: 'GRP_001', message: 'Group not found' } }
    }
    return { ok: true }
  })

  // ── GET /groups/:code/members ──────────────────────────────────────────────
  .get('/:code/members', async ({ params, set }) => {
    const group = await MemberGroup.findOne({ code: params.code }).lean()
    if (!group) {
      set.status = 404
      return { error: { code: 'GRP_001', message: 'Group not found' } }
    }

    const userIds = (group.members ?? []).map((m: any) => m.userId)

    // Bulk-fetch users and cards
    const [users, cards] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      Card.find({ userId: { $in: userIds }, status: 'active' }).lean(),
    ])

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))
    const cardMap = new Map(cards.map((c: any) => [c.userId.toString(), c]))

    const members = (group.members ?? []).map((entry: any) => {
      const uid  = entry.userId?.toString() ?? ''
      const user = userMap.get(uid)
      const card = cardMap.get(uid)
      return formatMember(entry, user, card)
    })

    return { members }
  })

  // ── POST /groups/:code/members ─────────────────────────────────────────────
  .post('/:code/members', async ({ params, body, set, currentUser }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }

    const user = await User.findById(body.userId).lean()
    if (!user) {
      set.status = 404
      return { error: { code: 'USR_001', message: 'User not found' } }
    }

    // Check duplicate
    const group = await MemberGroup.findOne({ code: params.code })
    if (!group) {
      set.status = 404
      return { error: { code: 'GRP_001', message: 'Group not found' } }
    }

    const alreadyIn = group.members.some(
      (m: any) => m.userId?.toString() === body.userId,
    )
    if (alreadyIn) {
      set.status = 409
      return { error: { code: 'GRP_002', message: 'User already in group' } }
    }

    const entry = { userId: body.userId, joinedAt: new Date() }
    group.members.push(entry as any)
    await group.save()

    const card = await Card.findOne({ userId: body.userId, status: 'active' }).lean()
    const member = formatMember(entry, user, card)

    return { member }
  }, {
    body: t.Object({
      userId: t.String(),
    }),
  })

  // ── DELETE /groups/:code/members/:userId ───────────────────────────────────
  .delete('/:code/members/:userId', async ({ params, set, currentUser }) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }

    const group = await MemberGroup.findOne({ code: params.code })
    if (!group) {
      set.status = 404
      return { error: { code: 'GRP_001', message: 'Group not found' } }
    }

    const before = group.members.length
    group.members = group.members.filter(
      (m: any) => m.userId?.toString() !== params.userId,
    ) as any

    if (group.members.length === before) {
      set.status = 404
      return { error: { code: 'GRP_003', message: 'Member not found in group' } }
    }

    await group.save()
    return { ok: true }
  })
