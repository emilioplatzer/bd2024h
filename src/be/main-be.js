const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))

const port = 3000


const pg = require('pg');
const fs = require('fs').promises;

app.get('/', (req, res) => {
    res.send(`Bienvenido al sitio de recomendaciones!    
        <br> ver <a href='./productos'>productos</a>
        <br> cargar nuevo <a href='./nuevo-producto'>producto</a>
    `)
})

app.get('/nuevo-producto', async (req, res) => {
    res.send(`<form action="/grabar-nuevo-producto" method="post">
        <label>nombre <input name="nombre"></label> <br>
        <label>categoría <input name="categoria"></label> <br>
        <label>lugar <input name="lugar"></label> <br>
        <input type=submit name="cargar">
    </form>`)
})

/** @param {(client:pg.Client)=>Promise<void>} algo */
/** @returns {pg.QueryResult} */
async function enUnaConexionaBD(algo){
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

    var result = await algo(client);
    
    await client.end()
    
    return result;
}

app.post('/grabar-nuevo-producto', async (req, res) => {
    console.log(req.body);

    const result = await enUnaConexionaBD(async client => {
        return await client.query(
            `INSERT INTO producto (nombre, categoria, lugar) VALUES ($1, $2, $3) RETURNING id;`,
            [req.body.nombre, req.body.categoria, req.body.lugar]
        );
    })
    res.send(`grabado el producto ${result.rows[0].id}!<BR><a href='./productos'>lista de prodcutos</a>`)
})

function sanarHTML(texto){
    return (texto+'').replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;");
}

app.get('/productos', async (req, res) => {

    const result = await enUnaConexionaBD(async client=>{
        return await client.query('SELECT * FROM producto')
    })
    
    res.send(`
        <table>
            <tr><th>id</th><th>nombre</th><th>categoria</th><th>lugar</th></tr>
            ${result.rows.map(row=>`<tr><td>${sanarHTML(row.id)}</td><td>${sanarHTML(row.nombre)}</td><td>${sanarHTML(row.categoria)}</td><td>${sanarHTML(row.lugar)}</td></tr>`).join('')}
        </table>
    `)
})
  
    

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})