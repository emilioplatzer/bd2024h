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

    await enUnaConexionaBD(async client => {
        await client.query(`INSERT INTO producto (nombre, categoria) VALUES ('${req.body.nombre}','${req.body.categoria}');`);
    })
    res.send(`grabado!<BR><a href='./productos'>lista de prodcutos</a>`)
})

app.get('/productos', async (req, res) => {

    const result = await enUnaConexionaBD(async client=>{
        return await client.query('SELECT * FROM producto')
    })
    
    res.send(`
        <table>
            ${result.rows.map(row=>`<tr><td>${row.nombre}</td><td>${row.categoria}</td></tr>`).join('')}
        </table>
    `)
})
  
    

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})