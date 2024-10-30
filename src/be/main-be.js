const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))

const port = 3000

const pg = require('pg');
const fs = require('fs').promises;

const miEstructura = {
    tablas: {
        producto: {
            campos: {
                id: { tipo: 'serial', pk:true },
                nombre: { tipo: 'text' },
                categoria: { tipo: 'text' },
                lugar: { tipo: 'text' },
            }
        },
        lugares: {
            campos: {
                lugar: { tipo: 'text', pk:true },
                nombre: { tipo: 'text' },
                ubicacion: { tipo: 'text' },
            }
        }
    }
}


app.get('/', (req, res) => {
    res.send(`Bienvenido al sitio de recomendaciones!    
        <br> ver <a href='./producto/lista'>productos</a>
        <br> cargar nuevo <a href='./producto/nuevo'>producto</a>
    `)
})

app.get('/producto/nuevo', async (req, res) => {
    res.send(`<form action="/producto/grabar-nuevo" method="post">
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

app.post('/producto/grabar-nuevo', async (req, res) => {
    console.log(req.body);

    const result = await enUnaConexionaBD(async client => {
        return await client.query(
            `INSERT INTO producto (nombre, categoria, lugar) VALUES ($1, $2, $3) RETURNING id;`,
            [req.body.nombre, req.body.categoria, req.body.lugar]
        );
    })
    res.send(`grabado el producto ${result.rows[0].id}!<BR><a href='../producto/lista'>lista de productos</a>`)
})

function sanarHTML(texto){
    return (texto+'').replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;");
}

app.get('/producto/lista', async (req, res) => {

    const result = await enUnaConexionaBD(async client=>{
        return await client.query('SELECT * FROM producto')
    })
    
    res.send(`
        <table>
            <tr><th>id</th><th>nombre</th><th>categoria</th><th>lugar</th></tr>
            ${result.rows.map(row=>`<tr><td>${sanarHTML(row.id)}</td><td>${sanarHTML(row.nombre)}</td><td>${sanarHTML(row.categoria)}</td><td>${sanarHTML(row.lugar)}</td></tr>`).join('')}
        </table>
        <a href='/producto/nuevo'>+ agregar uno</a>
    `)
})
  

// TODO hay que poner un middleware para que solo lo pueda ejecutar un admin:
app.get('/dump-db', async (req,res) => {
    var sql = []
    for (var tabla in miEstructura.tablas) {
        sql.push(`create table ${tabla} (`);
        var defTabla = miEstructura.tablas[tabla];
        var sqlCampos = []
        for (var campo in defTabla.campos) {
            var defCampo = defTabla.campos[campo];
            sqlCampos.push(`  ${campo} ${defCampo.tipo}${defCampo.pk?' primary key':''}`)
        }
        sql.push(sqlCampos.join(',\n'));
        sql.push(`);`);
    }
    await fs.writeFile('local-dump.sql', sql.join('\n'), 'utf8');
    res.send('Forbidensen!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})