const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000; // ou 80/443 se for produção

const cors = require('cors');
app.use(cors());

app.use(express.json());

// Garante que a pasta 'data' existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Rota que recebe e salva os dados do experimento
app.post('/salvar-dados', (req, res) => {
    const { participant_id, data } = req.body;

    if (!participant_id || !data) {
        return res.status(400).json({ error: 'Requisição incompleta: participant_id e data são obrigatórios.' });
    }

    const filename = `dados_participante_${participant_id}.json`;
    const filePath = path.join(dataDir, filename);

    fs.writeFile(filePath, JSON.stringify(data, null, 2), err => {
        if (err) {
            console.error('Erro ao salvar os dados:', err);
            return res.status(500).json({ error: 'Erro ao salvar o arquivo.' });
        }

        console.log(`Arquivo salvo com sucesso: ${filename}`);
        res.json({ success: true, filename });
    });
});

// Torna os arquivos disponíveis publicamente
app.use('/dados', express.static(dataDir));

// Rota padrão
app.get('/', (req, res) => {
    res.send('Servidor do experimento está funcionando.');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
});