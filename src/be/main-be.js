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
            auto: true,
            campos: {
                id: { tipo: 'serial', pk:true },
                nombre: { tipo: 'text' },
                categoria: { tipo: 'text' },
                lugar: { tipo: 'text' },
            }
        },
        lugar: {
            auto: true,
            campos: {
                lugar: { tipo: 'text', pk:true },
                nombre: { tipo: 'text' },
                ubicacion: { tipo: 'text', titulo:'ubicación' },
            }
        }
    }
}

function forbidensen(res){
    res.send('Forbidensen!')
}

function menuHtml(tabla){
    return `
    <br>
    <br> ver cada <a href='./${tabla}/lista'>${tabla}</a> en una lista
    <br> cargar nuevo <a href='./${tabla}/nuevo'>${tabla}</a>
    `
}

function endpointDeAutoTabla(req, res, hacer){
    const tabla = req.params.tabla;
    if (miEstructura.tablas[tabla] != null && miEstructura.tablas[tabla].auto){
        hacer(tabla, miEstructura.tablas[tabla], res)
    } else {
        forbidensen(res);
    }
}

app.get('/', (req, res) => {
    var nombreTablas = Object.keys(miEstructura.tablas).filter(tabla => miEstructura.tablas[tabla].auto);
    res.send(`Bienvenido al sitio de recomendaciones!
        ${nombreTablas.map(tabla=>
            menuHtml(tabla)
        )}
    `)
})

app.get('/:tabla/nuevo', async (req, res) => {
    endpointDeAutoTabla(req, res, (tabla, defTabla, res) => {
        var defCampos = defTabla.campos;
        const camposHtml = [];
        for(var campo in defCampos){
            var defCampo = defCampos[campo];
            camposHtml.push(`<label>${defCampo.titulo ?? campo} <input name="${campo}"></label> <br>`)
        }
        res.send(`<form action="/${tabla}/grabar-nuevo" method="post">
            ${camposHtml.join('\n')}
            <input type=submit name="cargar">
        </form>`)
    })
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

app.post('/:tabla/grabar-nuevo', async (req, res) => {
    console.log(req.body);
    endpointDeAutoTabla(req, res, async (tabla, defTabla, res) => {
        var nombreCampos = Object.keys(defTabla.campos).filter(campo=>defTabla.campos[campo].tipo != 'serial');
        var sql = `INSERT INTO ${tabla} (${nombreCampos}) VALUES (${nombreCampos.map((_,i)=>"$"+(i+1))}) 
            RETURNING ${nombreCampos.filter(campo => defTabla.campos[campo].pk)};`;
        var params = nombreCampos.map(campo => req.body[campo]);
        console.log('SQL',sql,params)
        const result = await enUnaConexionaBD(async client => {
            return await client.query(sql, params);
        })
        res.send(`grabado un registro de ${tabla} ${nombreCampos.filter(campo => defTabla.campos[campo].pk).map(campo=>result.rows[0][campo])}!<BR><a href='../${tabla}/lista'>lista de ${tabla}</a>`)
    })
})

function sanarHTML(texto){
    return (texto+'').replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;");
}

app.get('/:tabla/lista', async (req, res) => {
    endpointDeAutoTabla(req, res, async (tabla, defTabla, res) => {
        var defCampos = defTabla.campos;
        const result = await enUnaConexionaBD(async client=>{
            return await client.query(`SELECT * FROM ${tabla}`)
        })
        var listado = []
        listado.push(`<table></tr>`);
        for(var campo in defCampos){    
            listado.push(`<th>${defCampos[campo].titulo ?? campo}</th>`)
        }
        listado.push(`</tr>`)
        result.rows.forEach(row=>{
            listado.push(`<tr>`)
            for(var campo in defCampos){    
                listado.push(`<td>${row[campo]}</td>`)
            }
            listado.push(`</tr>`)
        })
        listado.push('</table>')
        listado.push(`<a href='/${tabla}/nuevo'>+ agregar uno</a>`);
        res.send(listado.join(''))
    })
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
        sql.push(`grant select, update, insert, delete on prod.${tabla} to prod_be;`);
    }
    await fs.writeFile('local-dump.sql', sql.join('\n'), 'utf8');
    forbidensen(res);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})