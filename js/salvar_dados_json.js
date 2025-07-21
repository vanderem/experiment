const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const { createClient } = require('@supabase/supabase-js');
const PORT = 3000; // ou 80/443 se for produção


const cors = require('cors');
app.use(cors());

app.use(express.json());

app.use(express.json({ limit: '5mb' }));

// Garante que a pasta 'data' existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Supabase config (substitua pelos seus dados)
const supabaseUrl = 'https://nyvmsrhdcvquacrgtauk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55dm1zcmhkY3ZxdWFjcmd0YXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNTIzODMsImV4cCI6MjA2ODYyODM4M30.tmMf42uldf5f76_9_LN65UrnFLTkqhn4ePnjodthYDw';
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota que recebe e salva os dados do experimento
app.post('/salvar-dados', (req, res) => {
    const { participant_id, data } = req.body;

    if (!participant_id || !data) {
        return res.status(400).json({ error: 'Requisição incompleta: participant_id e data são obrigatórios.' });
    }

    const filename = `dados_participante_${participant_id}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    const filePath = path.join(dataDir, filename);

    /*fs.writeFile(filePath, JSON.stringify(data, null, 2), err => {
        if (err) {
            console.error('Erro ao salvar os dados:', err);
            return res.status(500).json({ error: 'Erro ao salvar o arquivo.' });
        }

        console.log(`Arquivo salvo com sucesso: ${filename}`);
        res.json({ success: true, filename });
    });*/

    // Salvar no bucket
    const { error } = await supabase.storage
        .from('dados-experimento') // nome do bucket
        .upload(filename, fileContent, {
            contentType: 'application/json',
            upsert: true
        });

    if (error) {
        console.error("Erro ao salvar no Supabase:", error);
        return res.status(500).json({ error: 'Erro ao salvar no Supabase' });
    }

    console.log(`Dados salvos com sucesso: ${filename}`);
    res.json({ success: true, filename });

});

// Torna os arquivos disponíveis publicamente
app.use('/dados', express.static(dataDir));

// Rota padrão
app.get('/', (req, res) => {
    res.send('Servidor do experimento está funcionando.');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado em https://experimento-jp83.onrender.com/:${PORT}`);
});