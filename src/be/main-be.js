const express = require('express')
const app = express()
const port = 3000

const pg = require('pg');
const fs = require('fs').promises;

app.get('/', (req, res) => {
  res.send(`Bienvenido al sitio de recomendaciones!
    <a href='./productos'>productos</a>
    `)
})

app.get('/productos', async (req, res) => {
    const { Client } = pg
    const password = await fs.readFile('local-password', 'utf8');
    const client = new Client({
        user: 'prod_be',
        password,
        host: 'localhost',
        port: '5432',
        database: 'productos_db',        
    })
    await client.connect();

    await client.query('SET SEARCH_PATH = PROD;')
    const result = await client.query('SELECT * FROM producto')
    await client.end()
    
    res.send(`
        <table>
            ${result.rows.map(row=>`<tr><td>${row.nombre}</td><td>${row.categoria}</td></tr>`).join('')}
        </table>
    `)
})
  
    

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})