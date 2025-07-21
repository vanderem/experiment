const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const { createClient } = require('@supabase/supabase-js');
const PORT = 10000; // ou 80/443 se for produção


const cors = require('cors');
app.use(cors());

app.use(cors({
    origin: '*'  // ou especifique seu domínio
}));

app.use(express.json({ limit: '5mb' }));

// Garante que a pasta 'data' existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Supabase config (substitua pelos seus dados)
const supabaseUrl = 'https://nyvmsrhdcvquacrgtauk.supabase.co';
const supabaseKey = 'sb_secret_nif5vDVJhpFa1PsFg7sEUw_u40wMeQl';
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota que recebe e salva os dados do experimento
app.post('/salvar-dados', async (req, res) => {
    const { participant_id, data } = req.body;

    if (!participant_id || !data) {
        return res.status(400).json({ error: 'participant_id e data são obrigatórios' });
    }

    const filename = `dados_participante_${participant_id}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    const filePath = path.join(dataDir, filename);

    try {
        console.log(`📥 Recebendo dados do participante ${participant_id}`);

        // 1. Salvar localmente
        await fs.promises.writeFile(filePath, fileContent);
        console.log(`✅ Arquivo salvo localmente: ${filename}`);

        // 2. Salvar no Supabase
        const { error } = await supabase.storage
            .from('dados-experimento')
            .upload(filename, fileContent, {
                contentType: 'application/json',
                upsert: true
            });

        if (error) {
            console.error("❌ Erro ao salvar no Supabase:", error);
            return res.status(500).json({ error: 'Erro ao salvar no Supabase' });
        }

        console.log(`🆗 Arquivo salvo no Supabase: ${filename}`);
        return res.json({ success: true, filename });

    } catch (err) {
        console.error("❌ Erro inesperado:", err);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Torna os arquivos disponíveis publicamente
app.use('/dados', express.static(dataDir));

// Rota padrão
app.get('/', (req, res) => {
    res.send('Servidor do experimento está funcionando.');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado em https://experimento-jp83.onrender.com:${PORT}`);
    //console.log(`Servidor iniciado em http://localhost:${PORT}`);
});