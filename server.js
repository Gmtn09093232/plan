require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(cors());
app.use(express.json());

// ======================== Helpers ========================

async function list(table, joinConfig = null) {
  let query = supabase.from(table).select('*');
  if (joinConfig) {
    const { foreignKey, foreignTable, select, as } = joinConfig;
    query = supabase.from(table).select(`*, ${foreignTable}!inner(${select})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  if (joinConfig) {
    const { foreignTable, select, as } = joinConfig;
    return data.map(row => {
      const joined = row[foreignTable];
      if (joined) {
        row[as] = joined[select];
      }
      delete row[foreignTable];
      return row;
    });
  }
  return data;
}

async function create(table, body) {
  const { data, error } = await supabase.from(table).insert(body).select().single();
  if (error) throw error;
  return data;
}

async function update(table, id, body) {
  const pk = `${table.slice(0, -1)}_id`;
  const { data, error } = await supabase.from(table).update(body).eq(pk, id).select().single();
  if (error) throw error;
  return data;
}

async function remove(table, id) {
  const pk = `${table.slice(0, -1)}_id`;
  const { error } = await supabase.from(table).delete().eq(pk, id);
  if (error) throw error;
  return { success: true };
}

// ======================== API Routes ========================

// 1. Shops
app.get('/api/shops', async (req, res) => {
  try {
    const data = await list('shops');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/shops', async (req, res) => {
  try {
    const data = await create('shops', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/shops/:id', async (req, res) => {
  try {
    const data = await update('shops', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/shops/:id', async (req, res) => {
  try {
    const data = await remove('shops', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Operators
app.get('/api/operators', async (req, res) => {
  try {
    const data = await list('operators', {
      foreignKey: 'shop_id',
      foreignTable: 'shops',
      select: 'shop_name',
      as: 'shop_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/operators', async (req, res) => {
  try {
    const data = await create('operators', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/operators/:id', async (req, res) => {
  try {
    const data = await update('operators', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/operators/:id', async (req, res) => {
  try {
    const data = await remove('operators', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Machines
app.get('/api/machines', async (req, res) => {
  try {
    const data = await list('machines', {
      foreignKey: 'shop_id',
      foreignTable: 'shops',
      select: 'shop_name',
      as: 'shop_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/machines', async (req, res) => {
  try {
    const data = await create('machines', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/machines/:id', async (req, res) => {
  try {
    const data = await update('machines', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/machines/:id', async (req, res) => {
  try {
    const data = await remove('machines', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Projects
app.get('/api/projects', async (req, res) => {
  try {
    const data = await list('projects');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/projects', async (req, res) => {
  try {
    const data = await create('projects', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/projects/:id', async (req, res) => {
  try {
    const data = await update('projects', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const data = await remove('projects', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Assembly Parts
app.get('/api/assembly-parts', async (req, res) => {
  try {
    const data = await list('assembly_parts', {
      foreignKey: 'project_id',
      foreignTable: 'projects',
      select: 'project_name',
      as: 'project_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/assembly-parts', async (req, res) => {
  try {
    const data = await create('assembly_parts', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/assembly-parts/:id', async (req, res) => {
  try {
    const data = await update('assembly_parts', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/assembly-parts/:id', async (req, res) => {
  try {
    const data = await remove('assembly_parts', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Production Records (two joins)
app.get('/api/production-records', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('production_records')
      .select(`
        *,
        operators!inner(full_name),
        shops!inner(shop_name)
      `);
    if (error) throw error;
    const mapped = data.map(row => ({
      ...row,
      operator_name: row.operators?.full_name,
      shop_name: row.shops?.shop_name,
      operators: undefined,
      shops: undefined
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/production-records', async (req, res) => {
  try {
    const data = await create('production_records', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/production-records/:id', async (req, res) => {
  try {
    const data = await update('production_records', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/production-records/:id', async (req, res) => {
  try {
    const data = await remove('production_records', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Project Production
app.get('/api/project-production', async (req, res) => {
  try {
    const data = await list('project_production', {
      foreignKey: 'project_id',
      foreignTable: 'projects',
      select: 'project_name',
      as: 'project_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/project-production', async (req, res) => {
  try {
    const data = await create('project_production', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/project-production/:id', async (req, res) => {
  try {
    const data = await update('project_production', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/project-production/:id', async (req, res) => {
  try {
    const data = await remove('project_production', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Machine Time Registration
app.get('/api/machine-time-reg', async (req, res) => {
  try {
    const data = await list('machine_time_reg', {
      foreignKey: 'machine_id',
      foreignTable: 'machines',
      select: 'machine_name',
      as: 'machine_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/machine-time-reg', async (req, res) => {
  try {
    const data = await create('machine_time_reg', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/machine-time-reg/:id', async (req, res) => {
  try {
    const data = await update('machine_time_reg', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/machine-time-reg/:id', async (req, res) => {
  try {
    const data = await remove('machine_time_reg', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Assembly Records
app.get('/api/assembly-records', async (req, res) => {
  try {
    const data = await list('assembly_records', {
      foreignKey: 'part_id',
      foreignTable: 'assembly_parts',
      select: 'part_name',
      as: 'part_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/assembly-records', async (req, res) => {
  try {
    const data = await create('assembly_records', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/assembly-records/:id', async (req, res) => {
  try {
    const data = await update('assembly_records', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/assembly-records/:id', async (req, res) => {
  try {
    const data = await remove('assembly_records', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Issues
app.get('/api/issues', async (req, res) => {
  try {
    const data = await list('issues', {
      foreignKey: 'affected_project_id',
      foreignTable: 'projects',
      select: 'project_name',
      as: 'project_name'
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/issues', async (req, res) => {
  try {
    const data = await create('issues', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/issues/:id', async (req, res) => {
  try {
    const data = await update('issues', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const data = await remove('issues', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Plans
app.get('/api/plans', async (req, res) => {
  try {
    const data = await list('plans');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/plans', async (req, res) => {
  try {
    const data = await create('plans', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/plans/:id', async (req, res) => {
  try {
    const data = await update('plans', req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/plans/:id', async (req, res) => {
  try {
    const data = await remove('plans', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== Static Files & SPA Fallback ========================

// Serve static files (like index.html, CSS, JS) from the current directory
app.use(express.static(path.join(__dirname)));

// Catch-all: for any non-API GET request, send index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ======================== Start Server ========================

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
