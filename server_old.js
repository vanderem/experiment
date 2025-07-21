const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

app.use(express.static(__dirname));
app.use(express.json());

app.post('/data', (req, res) => {
    const data = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(path.join(__dirname, 'dados.json'), data);
    res.sendStatus(200);
});

// Garante que index.html seja servido na rota '/'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});