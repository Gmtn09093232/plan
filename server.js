// server.js - Bahir-Dar Factory Production Management System
// Backend API with Supabase (PostgreSQL) database

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ✅ Serve static files from the root directory (where server.js and index.html are)
app.use(express.static(__dirname));

// ─── Supabase Client ──────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test connection (optional)
(async () => {
  const { error } = await supabase.from('shops').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('❌ Supabase connection error:', error.message);
  } else {
    console.log('✅ Connected to Supabase');
  }
})();

// ─── Helper: random number ───────────────────────────────────
function rand(min, max) { return Math.round(min + Math.random() * (max - min)); }

// ─── API Routes ──────────────────────────────────────────────

// ─── 1. Get all shops ────────────────────────────────────────
app.get('/api/shops', async (req, res) => {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('shop_id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── 2. Get operators with shop info ────────────────────────
app.get('/api/operators', async (req, res) => {
  const shopFilter = req.query.shop_id;
  let query = supabase
    .from('operators')
    .select(`
      *,
      shops (shop_name)
    `)
    .order('full_name');
  if (shopFilter) {
    query = query.eq('shop_id', parseInt(shopFilter));
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  // Flatten the shop_name from the joined object
  const result = data.map(row => ({
    ...row,
    shop_name: row.shops?.shop_name || null,
    shops: undefined
  }));
  res.json(result);
});

// ─── 3. Get machines with shop info ─────────────────────────
app.get('/api/machines', async (req, res) => {
  const shopFilter = req.query.shop_id;
  let query = supabase
    .from('machines')
    .select(`
      *,
      shops (shop_name)
    `)
    .order('machine_code');
  if (shopFilter) {
    query = query.eq('shop_id', parseInt(shopFilter));
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const result = data.map(row => ({
    ...row,
    shop_name: row.shops?.shop_name || null,
    shops: undefined
  }));
  res.json(result);
});

// ─── 4. Get projects ────────────────────────────────────────
app.get('/api/projects', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('project_id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── 5. Get assembly parts ──────────────────────────────────
app.get('/api/assembly-parts', async (req, res) => {
  const { data, error } = await supabase
    .from('assembly_parts')
    .select(`
      *,
      projects (project_name)
    `)
    .order('part_id');
  if (error) return res.status(500).json({ error: error.message });
  const result = data.map(row => ({
    ...row,
    project_name: row.projects?.project_name || null,
    projects: undefined
  }));
  res.json(result);
});

// ─── 6. Production Records (operator performance) ──────────
app.get('/api/production-records', async (req, res) => {
  const { week_start, week_end, shop_id, operator_id } = req.query;
  let query = supabase
    .from('production_records')
    .select(`
      *,
      operators (full_name),
      shops (shop_name)
    `)
    .order('record_id', { ascending: false })
    .limit(200);
  if (week_start) query = query.eq('week_start', week_start);
  if (week_end) query = query.eq('week_end', week_end);
  if (shop_id) query = query.eq('shop_id', parseInt(shop_id));
  if (operator_id) query = query.eq('operator_id', parseInt(operator_id));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const result = data.map(row => ({
    ...row,
    full_name: row.operators?.full_name || null,
    shop_name: row.shops?.shop_name || null,
    operators: undefined,
    shops: undefined
  }));
  res.json(result);
});

// ─── 7. Create / Update production record ──────────────────
app.post('/api/production-records', async (req, res) => {
  const data = req.body;
  const { data: inserted, error } = await supabase
    .from('production_records')
    .insert([{
      operator_id: data.operator_id,
      shop_id: data.shop_id,
      week_start: data.week_start,
      week_end: data.week_end,
      planned_part: data.planned_part,
      planned_qty: data.planned_qty,
      planned_time: data.planned_time,
      actual_part: data.actual_part,
      actual_qty: data.actual_qty,
      actual_time: data.actual_time,
      performance_pct: data.performance_pct,
      delay_reason: data.delay_reason,
      sick_days: data.sick_days || 0,
      permission_days: data.permission_days || 0,
      lack_materials: data.lack_materials || 0,
      lack_tool_cutter: data.lack_tool_cutter || 0,
      design_problem: data.design_problem || 0,
      machine_breakdown: data.machine_breakdown || 0,
      machine_sequence_issue: data.machine_sequence_issue || 0,
      over_capacity: data.over_capacity || 0,
      machine_occupied: data.machine_occupied || 0,
      own_problem: data.own_problem || 0
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(inserted[0]);
});

// ─── 8. Project Production ──────────────────────────────────
app.get('/api/project-production', async (req, res) => {
  const { week_start, week_end, project_id } = req.query;
  let query = supabase
    .from('project_production')
    .select(`
      *,
      projects (project_name, category)
    `)
    .order('prod_id', { ascending: false });
  if (week_start) query = query.eq('week_start', week_start);
  if (week_end) query = query.eq('week_end', week_end);
  if (project_id) query = query.eq('project_id', parseInt(project_id));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const result = data.map(row => ({
    ...row,
    project_name: row.projects?.project_name || null,
    category: row.projects?.category || null,
    projects: undefined
  }));
  res.json(result);
});

app.post('/api/project-production', async (req, res) => {
  const data = req.body;
  const { data: inserted, error } = await supabase
    .from('project_production')
    .insert([{
      project_id: data.project_id,
      week_start: data.week_start,
      week_end: data.week_end,
      planned_qty: data.planned_qty,
      planned_time: data.planned_time,
      actual_qty: data.actual_qty,
      actual_time: data.actual_time,
      performance_pct: data.performance_pct,
      upto_date_qty: data.upto_date_qty,
      upto_date_time: data.upto_date_time,
      overall_perf_pct: data.overall_perf_pct
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(inserted[0]);
});

// ─── 9. Machine Time Registration ───────────────────────────
app.get('/api/machine-time', async (req, res) => {
  const { week_start, week_end, machine_id } = req.query;
  let query = supabase
    .from('machine_time_reg')
    .select(`
      *,
      machines (machine_code, machine_name, shop_id),
      shops (shop_name)
    `)
    .order('reg_id', { ascending: false });
  if (week_start) query = query.eq('week_start', week_start);
  if (week_end) query = query.eq('week_end', week_end);
  if (machine_id) query = query.eq('machine_id', parseInt(machine_id));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  // Flatten nested objects
  const result = data.map(row => ({
    ...row,
    machine_code: row.machines?.machine_code || null,
    machine_name: row.machines?.machine_name || null,
    shop_name: row.shops?.shop_name || null,
    machines: undefined,
    shops: undefined
  }));
  res.json(result);
});

app.post('/api/machine-time', async (req, res) => {
  const data = req.body;
  const { data: inserted, error } = await supabase
    .from('machine_time_reg')
    .insert([{
      machine_id: data.machine_id,
      week_start: data.week_start,
      week_end: data.week_end,
      planned_time: data.planned_time,
      actual_time: data.actual_time,
      utilization_pct: data.utilization_pct,
      remark: data.remark
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(inserted[0]);
});

// ─── 10. Assembly Records ──────────────────────────────────
app.get('/api/assembly-records', async (req, res) => {
  const { week_start, week_end, part_id } = req.query;
  let query = supabase
    .from('assembly_records')
    .select(`
      *,
      assembly_parts (part_name, project_id),
      projects (project_name)
    `)
    .order('assembly_id', { ascending: false });
  if (week_start) query = query.eq('week_start', week_start);
  if (week_end) query = query.eq('week_end', week_end);
  if (part_id) query = query.eq('part_id', parseInt(part_id));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const result = data.map(row => ({
    ...row,
    part_name: row.assembly_parts?.part_name || null,
    project_name: row.projects?.project_name || null,
    assembly_parts: undefined,
    projects: undefined
  }));
  res.json(result);
});

app.post('/api/assembly-records', async (req, res) => {
  const data = req.body;
  const { data: inserted, error } = await supabase
    .from('assembly_records')
    .insert([{
      part_id: data.part_id,
      week_start: data.week_start,
      week_end: data.week_end,
      assembling_planned: data.assembling_planned,
      assembling_wip: data.assembling_wip,
      assembling_completed: data.assembling_completed,
      polishing_planned: data.polishing_planned,
      polishing_wip: data.polishing_wip,
      polishing_completed: data.polishing_completed,
      painting_planned: data.painting_planned,
      painting_wip: data.painting_wip,
      painting_completed: data.painting_completed,
      upto_date_qty: data.upto_date_qty,
      performance_pct: data.performance_pct
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(inserted[0]);
});

// ─── 11. Issues / Reasons ──────────────────────────────────
app.get('/api/issues', async (req, res) => {
  const { week_start, week_end } = req.query;
  let query = supabase
    .from('issues')
    .select(`
      *,
      projects (project_name)
    `)
    .order('issue_id', { ascending: false });
  if (week_start) query = query.eq('week_start', week_start);
  if (week_end) query = query.eq('week_end', week_end);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const result = data.map(row => ({
    ...row,
    project_name: row.projects?.project_name || null,
    projects: undefined
  }));
  res.json(result);
});

app.post('/api/issues', async (req, res) => {
  const data = req.body;
  const { data: inserted, error } = await supabase
    .from('issues')
    .insert([{
      week_start: data.week_start,
      week_end: data.week_end,
      problem: data.problem,
      root_cause: data.root_cause,
      impact_level: data.impact_level,
      solution: data.solution,
      affected_project_id: data.affected_project_id
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(inserted[0]);
});

// ─── 12. Plans (next week) ──────────────────────────────────
app.get('/api/plans', async (req, res) => {
  const { week_start, week_end, plan_type, reference_id } = req.query;
  let query = supabase
    .from('plans')
    .select('*')
    .order('plan_id', { ascending: false });
  if (week_start) query = query.eq('week_start', week_start);
  if (week_end) query = query.eq('week_end', week_end);
  if (plan_type) query = query.eq('plan_type', plan_type);
  if (reference_id) query = query.eq('reference_id', parseInt(reference_id));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/plans', async (req, res) => {
  const data = req.body;
  const { data: inserted, error } = await supabase
    .from('plans')
    .insert([{
      week_start: data.week_start,
      week_end: data.week_end,
      plan_type: data.plan_type,
      reference_id: data.reference_id,
      planned_qty: data.planned_qty,
      planned_time: data.planned_time,
      target_qty: data.target_qty,
      target_time: data.target_time,
      growth_pct: data.growth_pct,
      notes: data.notes
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(inserted[0]);
});

// ─── 13. Dashboard summary stats ────────────────────────────
app.get('/api/dashboard/stats', async (req, res) => {
  const weekStart = req.query.week_start || '2026-07-10';
  const weekEnd = req.query.week_end || '2026-07-10';

  try {
    // Total operators
    const { count: totalOperators, error: e1 } = await supabase
      .from('operators')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Total machines
    const { count: totalMachines, error: e2 } = await supabase
      .from('machines')
      .select('*', { count: 'exact', head: true });

    // Total projects active
    const { count: totalProjects, error: e3 } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Average performance
    const { data: perfData, error: e4 } = await supabase
      .from('production_records')
      .select('performance_pct')
      .eq('week_start', weekStart)
      .eq('week_end', weekEnd);

    // Machine utilization
    const { data: utilData, error: e5 } = await supabase
      .from('machine_time_reg')
      .select('utilization_pct')
      .eq('week_start', weekStart)
      .eq('week_end', weekEnd);

    // Plan coverage (plans for next week)
    const { count: planCount, error: e6 } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('week_start', '2026-07-14');

    if (e1 || e2 || e3 || e4 || e5 || e6) {
      return res.status(500).json({ error: 'Error fetching stats' });
    }

    const avgPerf = perfData && perfData.length
      ? Math.round(perfData.reduce((sum, r) => sum + r.performance_pct, 0) / perfData.length)
      : 83;
    const avgUtil = utilData && utilData.length
      ? Math.round(utilData.reduce((sum, r) => sum + r.utilization_pct, 0) / utilData.length)
      : 71;

    const totalRefs = totalOperators + totalMachines + totalProjects;
    const planCoverage = totalRefs > 0 ? Math.round((planCount / totalRefs) * 100) : 92;

    res.json({
      totalOperators,
      totalMachines,
      totalProjects,
      avgPerformance: avgPerf,
      machineUtilization: avgUtil,
      planCoverage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 14. Generate demo data for current week ────────────────
app.post('/api/generate-demo-week', async (req, res) => {
  const { week_start, week_end } = req.body;
  if (!week_start || !week_end) {
    return res.status(400).json({ error: 'week_start and week_end required' });
  }

  try {
    // Get operators
    const { data: ops, error: e1 } = await supabase
      .from('operators')
      .select('operator_id, shop_id');
    if (e1) throw new Error(e1.message);

    // Get projects
    const { data: projs, error: e2 } = await supabase
      .from('projects')
      .select('project_id');
    if (e2) throw new Error(e2.message);

    // Get machines
    const { data: macs, error: e3 } = await supabase
      .from('machines')
      .select('machine_id');
    if (e3) throw new Error(e3.message);

    // Get assembly parts
    const { data: parts, error: e4 } = await supabase
      .from('assembly_parts')
      .select('part_id');
    if (e4) throw new Error(e4.message);

    const reasons = ['—', 'Sick', 'Material', 'Tool', 'Breakdown', 'Design', 'Permistion'];

    // Prepare bulk inserts
    const prodRecords = ops.map(op => {
      const plannedQty = rand(15, 70);
      const actualQty = rand(10, 65);
      const perf = Math.round((actualQty / plannedQty) * 100);
      const r = reasons[rand(0, reasons.length - 1)];
      return {
        operator_id: op.operator_id,
        shop_id: op.shop_id,
        week_start,
        week_end,
        planned_part: 'Part-' + String.fromCharCode(65 + rand(0, 7)),
        planned_qty: plannedQty,
        planned_time: rand(2, 8),
        actual_part: 'Part-' + String.fromCharCode(65 + rand(0, 7)),
        actual_qty: actualQty,
        actual_time: rand(2, 8),
        performance_pct: perf,
        delay_reason: r === '—' ? null : r,
        sick_days: r === 'Sick' ? rand(1, 3) : 0,
        permission_days: r === 'Permistion' ? rand(1, 2) : 0,
        lack_materials: r === 'Material' ? 1 : 0,
        lack_tool_cutter: r === 'Tool' ? 1 : 0,
        design_problem: r === 'Design' ? 1 : 0,
        machine_breakdown: r === 'Breakdown' ? 1 : 0,
        machine_sequence_issue: 0,
        over_capacity: 0,
        machine_occupied: 0,
        own_problem: 0
      };
    });

    const projectProd = projs.map(p => {
      const planned = rand(20, 90);
      const actual = Math.round(planned * (0.6 + Math.random() * 0.4));
      const perf = Math.round((actual / planned) * 100);
      return {
        project_id: p.project_id,
        week_start,
        week_end,
        planned_qty: planned,
        planned_time: rand(10, 40),
        actual_qty: actual,
        actual_time: rand(8, 35),
        performance_pct: perf,
        upto_date_qty: rand(50, 200),
        upto_date_time: `${rand(1, 30)} days`,
        overall_perf_pct: rand(70, 95)
      };
    });

    const machineTime = macs.map(m => {
      const planned = rand(20, 70);
      const actual = Math.round(planned * (0.5 + Math.random() * 0.5));
      const util = Math.round((actual / planned) * 100);
      return {
        machine_id: m.machine_id,
        week_start,
        week_end,
        planned_time: planned,
        actual_time: actual,
        utilization_pct: util,
        remark: ''
      };
    });

    const assemblyRecords = parts.map(p => {
      const asm = rand(55, 95);
      const pol = rand(45, 90);
      const pnt = rand(40, 85);
      return {
        part_id: p.part_id,
        week_start,
        week_end,
        assembling_planned: asm,
        assembling_wip: rand(10, 40),
        assembling_completed: rand(30, 80),
        polishing_planned: pol,
        polishing_wip: rand(10, 35),
        polishing_completed: rand(25, 70),
        painting_planned: pnt,
        painting_wip: rand(10, 30),
        painting_completed: rand(20, 65),
        upto_date_qty: rand(10, 50),
        performance_pct: Math.round((asm + pol + pnt) / 3)
      };
    });

    // Insert in batches (or one by one – Supabase can handle bulk insert)
    const { error: errProd } = await supabase.from('production_records').insert(prodRecords);
    if (errProd) throw new Error(errProd.message);

    const { error: errProj } = await supabase.from('project_production').insert(projectProd);
    if (errProj) throw new Error(errProj.message);

    const { error: errMac } = await supabase.from('machine_time_reg').insert(machineTime);
    if (errMac) throw new Error(errMac.message);

    const { error: errAsm } = await supabase.from('assembly_records').insert(assemblyRecords);
    if (errAsm) throw new Error(errAsm.message);

    res.json({ message: `Demo data generated for ${week_start} - ${week_end}`, count: ops.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve frontend ──────────────────────────────────────────
// ✅ This sends index.html from the root directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints ready (Supabase backend)`);
});
