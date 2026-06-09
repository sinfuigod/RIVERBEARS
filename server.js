const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let activeHooks = []; // Хранит { id, expiresAt, reports }
const DURATION = 30 * 60 * 1000; // 30 минут

// Очистка просроченных меток по таймеру каждую секунду
setInterval(() => {
    const now = Date.now();
    activeHooks = activeHooks.filter(h => h.expiresAt > now);
}, 1000);

// Отдать клиентам список активных крючков
app.get('/api/hooks', (req, res) => {
    res.json(activeHooks);
});

// Обработка действий игроков (нажатие "Найдено" или "Жалоба")
app.post('/api/hook', (req, res) => {
    const { action, id } = req.body;
    const now = Date.now();
    const existingIndex = activeHooks.findIndex(h => h.id === id);

    if (action === 'activate') {
        if (existingIndex !== -1) {
            // Если точка уже активна, просто продлеваем ей жизнь на 30 минут
            activeHooks[existingIndex].expiresAt = now + DURATION;
        } else {
            // Если новая, проверяем жесткий лимит в 3 штуки
            if (activeHooks.length >= 3) {
                return res.status(400).json({ error: "Все 3 слота заняты! Ждите таймер или кидайте жалобы." });
            }
            activeHooks.push({ id, expiresAt: now + DURATION, reports: 0 });
        }
    } 
    else if (action === 'report') {
        if (existingIndex !== -1) {
            activeHooks[existingIndex].reports += 1;
            // Если набралось 2 жалобы — удаляем точку
            if (activeHooks[existingIndex].reports >= 2) {
                activeHooks.splice(existingIndex, 1);
            }
        }
    }

    res.json(activeHooks);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
});
