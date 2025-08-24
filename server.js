import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mime from 'mime-types';
import mysql from 'mysql2/promise';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve frontend and uploads
const FRONT_DIR = path.join(__dirname, '..', 'frontend');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(FRONT_DIR));

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mural_emaus',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
});

// Multer config (10MB limit, images only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'bin';
    const safe = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
    cb(null, safe);
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Apenas imagens são permitidas.'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Routes
app.get('/api/health', (req,res)=> res.json({ ok: true }));

app.get('/api/photos', async (req, res) => {
  try {
    const room = req.query.room;
    if (!room) return res.status(400).send('room é obrigatório');
    const [rows] = await pool.query(
      'SELECT id, room_id, name, caption, file_path, created_at FROM photos WHERE room_id = ? ORDER BY created_at DESC',
      [room]
    );
    const host = req.protocol + '://' + req.get('host');
    const mapped = rows.map(r => ({
      id: r.id,
      room_id: r.room_id,
      name: r.name,
      caption: r.caption,
      url: host + '/uploads/' + r.file_path,
      created_at: r.created_at
    }));
    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao buscar fotos');
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const room = req.body.room;
    const name = (req.body.name || '').slice(0,120);
    if (!room) return res.status(400).send('room é obrigatório');
    if (!req.file) return res.status(400).send('Arquivo ausente');

    const fileName = req.file.filename;
    await pool.query(
      'INSERT INTO photos (room_id, name, caption, file_path) VALUES (?, ?, ?, ?)',
      [room, name, '', fileName]
    );
    res.json({ ok: true, file: '/uploads/' + fileName });
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao salvar foto');
  }
});

app.put('/api/photos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { caption } = req.body;
    await pool.query('UPDATE photos SET caption = ? WHERE id = ?', [caption || '', id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao atualizar legenda');
  }
});

app.delete('/api/photos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [[row]] = await pool.query('SELECT file_path FROM photos WHERE id = ?', [id]);
    if (!row) return res.status(404).send('Não encontrado');
    const filePath = path.join(UPLOAD_DIR, row.file_path);
    await pool.query('DELETE FROM photos WHERE id = ?', [id]);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao excluir foto');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Servidor rodando em http://localhost:' + PORT);
});
