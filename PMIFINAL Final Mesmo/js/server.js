const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Garantir que o diretório data existe
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(USERS_FILE);
        } catch {
            await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
        }
    } catch (error) {
        console.error('Erro ao criar diretório data:', error);
    }
}

// Ler usuários do arquivo
async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Salvar usuários no arquivo
async function saveUsers(users) {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Erro ao salvar usuários:', error);
        throw error;
    }
}

// Gerar token simples
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Rota de registro
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres.' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'E-mail inválido.' });
    }

    try {
        const users = await readUsers();
        
        // Verificar se email já existe
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar novo usuário
        const newUser = {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        await saveUsers(users);

        res.status(201).json({
            message: 'Conta criada com sucesso!',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota de login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    try {
        const users = await readUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }

        // Gerar token
        const token = generateToken();

        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para verificar token (opcional)
app.get('/api/auth/verify', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    // Em uma aplicação real, você validaria o token aqui
    // Por enquanto, apenas retornamos sucesso
    res.json({ valid: true });
});

// Inicializar servidor
async function startServer() {
    await ensureDataDir();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📁 Dados salvos em: ${USERS_FILE}`);
        console.log(`\n📋 Endpoints disponíveis:`);
        console.log(`   POST /api/auth/register - Cadastrar usuário`);
        console.log(`   POST /api/auth/login - Fazer login`);
        console.log(`   GET  /api/auth/verify - Verificar token\n`);
    });
}

startServer().catch(console.error);

