import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { WalletPermission, AcademicYear, GradeLevel, StoreSettings, Branch, User } from '../../models'

export const settingsController = new Elysia({ prefix: '/settings' })
  .use(authPlugin(['admin', 'supervisor']))

  // ── Wallet Permissions ────────────────────────────────────────────────────────

  .get('/wallet-permissions', async () => {
    const walletPermissions = await WalletPermission.find().lean()
    return { walletPermissions }
  })

  .patch('/wallet-permissions/:code', async ({ params, body, set }) => {
    const walletPermission = await WalletPermission.findOneAndUpdate(
      { code: params.code },
      { $set: body },
      { new: true, upsert: true },
    ).lean()
    if (!walletPermission) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Wallet permission not found' } }
    }
    return { walletPermission }
  }, {
    body: t.Object({
      name:      t.Optional(t.String()),
      desc:      t.Optional(t.String()),
      amount:    t.Optional(t.Number()),
      enabled:   t.Optional(t.Boolean()),
      startDate: t.Optional(t.String()),
      endDate:   t.Optional(t.String()),
    }),
  })

  // ── Academic Years ────────────────────────────────────────────────────────────

  .get('/academic-years', async () => {
    const academicYears = await AcademicYear.find().sort({ year: -1 }).lean()
    return { academicYears }
  })

  .post('/academic-years', async ({ body, set }) => {
    const existing = await AcademicYear.findOne({ year: body.year })
    if (existing) {
      set.status = 409
      return { error: { code: 'CONFLICT', message: 'Academic year already exists' } }
    }
    const academicYear = await AcademicYear.create(body)
    return { academicYear }
  }, {
    body: t.Object({
      year:      t.String(),
      semesters: t.Optional(t.Array(t.Object({
        name:      t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate:   t.Optional(t.String()),
      }))),
      active: t.Optional(t.Boolean()),
    }),
  })

  .patch('/academic-years/:id', async ({ params, body, set }) => {
    const academicYear = await AcademicYear.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true },
    ).lean()
    if (!academicYear) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Academic year not found' } }
    }
    return { academicYear }
  }, {
    body: t.Object({
      year:      t.Optional(t.String()),
      semesters: t.Optional(t.Array(t.Object({
        name:      t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate:   t.Optional(t.String()),
      }))),
      active: t.Optional(t.Boolean()),
    }),
  })

  .delete('/academic-years/:id', async ({ params, set }) => {
    const result = await AcademicYear.findByIdAndDelete(params.id)
    if (!result) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Academic year not found' } }
    }
    return { ok: true }
  })

  // ── Grade Levels ─────────────────────────────────────────────────────────────

  .get('/grade-levels', async () => {
    const gradeLevels = await GradeLevel.find().sort({ sortOrder: 1 }).lean()
    return { gradeLevels }
  })

  .post('/grade-levels', async ({ body, set }) => {
    const existing = await GradeLevel.findOne({ code: body.code })
    if (existing) {
      set.status = 409
      return { error: { code: 'CONFLICT', message: 'Grade code already exists' } }
    }
    const count = await GradeLevel.countDocuments()
    const gradeLevel = await GradeLevel.create({ ...body, sortOrder: body.sortOrder ?? count })
    return { gradeLevel }
  }, {
    body: t.Object({
      code:       t.String(),
      name:       t.String(),
      gradeGroup: t.Union([t.Literal('primary'), t.Literal('secondary'), t.Literal('staff'), t.Literal('visitor')]),
      canRepeat:  t.Optional(t.Boolean()),
      sortOrder:  t.Optional(t.Number()),
    }),
  })

  .patch('/grade-levels/reorder', async ({ body }) => {
    await Promise.all(
      body.items.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        GradeLevel.findByIdAndUpdate(id, { $set: { sortOrder } })
      )
    )
    const gradeLevels = await GradeLevel.find().sort({ sortOrder: 1 }).lean()
    return { gradeLevels }
  }, {
    body: t.Object({
      items: t.Array(t.Object({ id: t.String(), sortOrder: t.Number() })),
    }),
  })

  .patch('/grade-levels/:id', async ({ params, body, set }) => {
    const gradeLevel = await GradeLevel.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true },
    ).lean()
    if (!gradeLevel) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Grade level not found' } }
    }
    return { gradeLevel }
  }, {
    body: t.Object({
      code:       t.Optional(t.String()),
      name:       t.Optional(t.String()),
      gradeGroup: t.Optional(t.Union([t.Literal('primary'), t.Literal('secondary'), t.Literal('staff'), t.Literal('visitor')])),
      canRepeat:  t.Optional(t.Boolean()),
      sortOrder:  t.Optional(t.Number()),
    }),
  })

  .delete('/grade-levels/:id', async ({ params, set }) => {
    const result = await GradeLevel.findByIdAndDelete(params.id)
    if (!result) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Grade level not found' } }
    }
    return { ok: true }
  })

  // ── Mid-year Enrollment ───────────────────────────────────────────────────────

  .post('/mid-year-enroll', async ({ body, set }) => {
    const student = await User.findById(body.studentId)
    if (!student) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Student not found' } }
    }
    if (student.role !== 'student') {
      set.status = 400
      return { error: { code: 'INVALID_ROLE', message: 'User is not a student' } }
    }
    student.studentProfile = {
      ...student.studentProfile,
      gradeLevel: body.gradeLevel,
    } as any
    await student.save()
    const { passwordHash: _, ...safe } = student.toObject() as any
    return { student: safe }
  }, {
    body: t.Object({
      studentId:  t.String(),
      gradeLevel: t.String(),
    }),
  })

  // ── Store Settings (singleton) ────────────────────────────────────────────────

  .get('/store', async () => {
    let store = await StoreSettings.findOne({ key: 'default' }).lean()
    if (!store) {
      store = await StoreSettings.create({ key: 'default', name: '', address: '', taxId: '' })
    }
    return { store }
  })

  .patch('/store', async ({ body }) => {
    const store = await StoreSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: body },
      { new: true, upsert: true },
    ).lean()
    return { store }
  }, {
    body: t.Object({
      name:    t.Optional(t.String()),
      address: t.Optional(t.String()),
      taxId:   t.Optional(t.String()),
      logoUrl: t.Optional(t.String()),
    }),
  })

  // ── Branches ──────────────────────────────────────────────────────────────────

  .get('/branches', async () => {
    const branches = await Branch.find().sort({ code: 1 }).lean()
    return { branches }
  })

  .post('/branches', async ({ body, set }) => {
    const existing = await Branch.findOne({ code: body.code })
    if (existing) {
      set.status = 409
      return { error: { code: 'CONFLICT', message: 'Branch code already exists' } }
    }
    const branch = await Branch.create(body)
    return { branch }
  }, {
    body: t.Object({
      code: t.String(),
      name: t.String(),
    }),
  })

  .patch('/branches/:code', async ({ params, body, set }) => {
    const branch = await Branch.findOneAndUpdate(
      { code: params.code },
      { $set: body },
      { new: true },
    ).lean()
    if (!branch) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Branch not found' } }
    }
    return { branch }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
    }),
  })

  .delete('/branches/:code', async ({ params, set }) => {
    const result = await Branch.findOneAndDelete({ code: params.code })
    if (!result) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Branch not found' } }
    }
    return { ok: true }
  })
